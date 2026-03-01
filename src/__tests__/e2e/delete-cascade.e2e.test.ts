import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  deleteChain,
  makeReq,
  ownerSession,
  assignedCleanerSession,
  crossOrgSession,
  fakeTurnover,
  createSchemaMock,
} from "./helpers";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetApiSession,
  mockIsAuthError,
  mockIsOwner,
  mockDb,
  mockDeleteObject,
} = vi.hoisted(() => {
  return {
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockIsOwner: vi.fn(),
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mockDeleteObject: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
  isOwner: mockIsOwner,
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());

vi.mock("@/lib/r2", () => ({
  deleteObject: mockDeleteObject,
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { DELETE as TurnoverDELETE } from "@/app/api/turnovers/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────

const makeParams = () => ({ params: Promise.resolve({ id: "t-1" }) });

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Delete Cascade E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsAuthError.mockReturnValue(false);
    mockIsOwner.mockReturnValue(true);
  });

  describe("Turnover with multiple photos — R2 cleanup", () => {
    it("fetches photo R2 keys before DB cascade, then deletes all R2 objects", async () => {
      const turnover = fakeTurnover();

      const photos = [
        {
          r2KeyOriginal: "org-1/p-1/t-1/photo1.jpg",
          r2KeyThumbnail: "org-1/p-1/t-1/photo1_thumb.jpg",
        },
        {
          r2KeyOriginal: "org-1/p-1/t-1/photo2.jpg",
          r2KeyThumbnail: null,
        },
        {
          r2KeyOriginal: "org-1/p-1/t-1/photo3.heic",
          r2KeyThumbnail: "org-1/p-1/t-1/photo3_thumb.jpg",
        },
      ];

      // Mock sequence: turnover lookup, photos fetch
      mockDb.select
        .mockReturnValueOnce(chainable([turnover]))
        .mockReturnValueOnce(chainable(photos));

      const dChain = deleteChain();
      mockDb.delete.mockReturnValue(dChain);

      const res = await TurnoverDELETE(
        makeReq("http://localhost:3000/api/turnovers/t-1", "DELETE"),
        makeParams()
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // 5 R2 deletions: 3 originals + 2 thumbnails (photo2 has null thumbnail)
      expect(mockDeleteObject).toHaveBeenCalledTimes(5);
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "org-1/p-1/t-1/photo1.jpg"
      );
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "org-1/p-1/t-1/photo1_thumb.jpg"
      );
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "org-1/p-1/t-1/photo2.jpg"
      );
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "org-1/p-1/t-1/photo3.heic"
      );
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "org-1/p-1/t-1/photo3_thumb.jpg"
      );

      // DB delete was called
      expect(mockDb.delete).toHaveBeenCalled();

      // Verify ordering: photos were fetched (2nd select) BEFORE delete
      const selectOrder = mockDb.select.mock.invocationCallOrder;
      const deleteOrder = mockDb.delete.mock.invocationCallOrder;
      expect(selectOrder[1]).toBeLessThan(deleteOrder[0]);
    });

    it("R2 deletion failures do not prevent DB deletion (Promise.allSettled)", async () => {
      const turnover = fakeTurnover();
      const photos = [
        {
          r2KeyOriginal: "org-1/p-1/t-1/photo1.jpg",
          r2KeyThumbnail: null,
        },
        {
          r2KeyOriginal: "org-1/p-1/t-1/photo2.jpg",
          r2KeyThumbnail: null,
        },
      ];

      mockDb.select
        .mockReturnValueOnce(chainable([turnover]))
        .mockReturnValueOnce(chainable(photos));

      // First R2 delete succeeds, second fails
      mockDeleteObject
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("R2 unavailable"));

      const dChain = deleteChain();
      mockDb.delete.mockReturnValue(dChain);

      const res = await TurnoverDELETE(
        makeReq("http://localhost:3000/api/turnovers/t-1", "DELETE"),
        makeParams()
      );

      // Response should still be 200
      expect(res.status).toBe(200);
      // DB delete still happened
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("delete on turnover with zero photos still succeeds", async () => {
      const turnover = fakeTurnover();

      mockDb.select
        .mockReturnValueOnce(chainable([turnover]))
        .mockReturnValueOnce(chainable([])); // no photos

      const dChain = deleteChain();
      mockDb.delete.mockReturnValue(dChain);

      const res = await TurnoverDELETE(
        makeReq("http://localhost:3000/api/turnovers/t-1", "DELETE"),
        makeParams()
      );
      expect(res.status).toBe(200);
      expect(mockDeleteObject).not.toHaveBeenCalled();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe("Permission checks block before any cleanup", () => {
    it("cleaner cannot delete — no R2 cleanup attempted", async () => {
      mockGetApiSession.mockResolvedValue(assignedCleanerSession);
      mockIsOwner.mockReturnValue(false);

      const res = await TurnoverDELETE(
        makeReq("http://localhost:3000/api/turnovers/t-1", "DELETE"),
        makeParams()
      );
      expect(res.status).toBe(403);
      expect(mockDeleteObject).not.toHaveBeenCalled();
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("cross-org owner cannot delete — no R2 cleanup attempted", async () => {
      mockGetApiSession.mockResolvedValue(crossOrgSession);
      mockIsOwner.mockReturnValue(true);

      // Turnover exists but in different org
      const turnover = fakeTurnover({ propertyOrgId: "org-1" });
      mockDb.select.mockReturnValue(chainable([turnover]));

      const res = await TurnoverDELETE(
        makeReq("http://localhost:3000/api/turnovers/t-1", "DELETE"),
        makeParams()
      );
      expect(res.status).toBe(404);
      expect(mockDeleteObject).not.toHaveBeenCalled();
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });
});
