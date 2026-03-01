import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  insertChain,
  updateChain,
  makeReq,
  ownerSession,
  assignedCleanerSession,
  unassignedCleanerSession,
  viewerSession,
  crossOrgSession,
  fakeTurnover,
  fakePhoto,
  createSchemaMock,
} from "./helpers";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetApiSession,
  mockIsAuthError,
  mockIsOwner,
  mockDb,
  mockGetPresignedUploadUrl,
  mockGetObject,
  mockPutObject,
  mockRandomUUID,
  mockSharp,
  mockDeleteObject,
} = vi.hoisted(() => {
  const sharpInstance = {
    metadata: vi.fn().mockResolvedValue({ format: "jpeg", exif: null }),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("thumb-data")),
  };
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
    mockGetPresignedUploadUrl: vi
      .fn()
      .mockResolvedValue("https://r2.example.com/presigned"),
    mockGetObject: vi.fn().mockResolvedValue(Buffer.from("fake-image-data")),
    mockPutObject: vi.fn().mockResolvedValue(undefined),
    mockRandomUUID: vi
      .fn()
      .mockReturnValue("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
    mockSharp: Object.assign(vi.fn().mockReturnValue(sharpInstance), {
      _instance: sharpInstance,
    }),
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
  getPresignedUploadUrl: mockGetPresignedUploadUrl,
  getObject: mockGetObject,
  putObject: mockPutObject,
  deleteObject: mockDeleteObject,
}));

vi.mock("sharp", () => ({ default: mockSharp }));
vi.mock("crypto", () => ({ randomUUID: mockRandomUUID }));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { POST as TurnoversPOST } from "@/app/api/turnovers/route";
import { POST as PresignPOST } from "@/app/api/photos/presign/route";
import { POST as ConfirmPOST } from "@/app/api/photos/confirm/route";
import {
  GET as TurnoverGET,
  PATCH as TurnoverPATCH,
  DELETE as TurnoverDELETE,
} from "@/app/api/turnovers/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────

const turnoverLookup = {
  id: "t-1",
  propertyId: "p-1",
  propertyOrgId: "org-1",
  status: "open",
};

const makeParams = () => ({ params: Promise.resolve({ id: "t-1" }) });

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Multi-Role Access E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthError.mockReturnValue(false);
  });

  describe("Owner creates, assigned cleaner uploads", () => {
    it("owner creates turnover, then assigned cleaner presigns and confirms", async () => {
      // Step 1: Owner creates turnover
      mockGetApiSession.mockResolvedValue(ownerSession);
      mockIsOwner.mockReturnValue(true);

      mockDb.select.mockReturnValue(
        chainable([{ id: "p-1", orgId: "org-1", name: "Beach House" }])
      );
      mockDb.insert.mockReturnValue(
        insertChain(fakeTurnover({ id: "t-1" }))
      );

      const createRes = await TurnoversPOST(
        makeReq("http://localhost:3000/api/turnovers", "POST", {
          property_id: "p-1",
          checkout_date: "2025-03-01",
          checkin_date: "2025-03-02",
        })
      );
      expect(createRes.status).toBe(201);

      // Step 2: Switch to assigned cleaner
      mockGetApiSession.mockResolvedValue(assignedCleanerSession);
      mockIsOwner.mockReturnValue(false);

      // Presign: turnover lookup + assignment check
      mockDb.select
        .mockReturnValueOnce(chainable([turnoverLookup]))
        .mockReturnValueOnce(
          chainable([
            {
              propertyId: "p-1",
              userId: assignedCleanerSession.userId,
            },
          ])
        );

      const presignRes = await PresignPOST(
        makeReq("http://localhost:3000/api/photos/presign", "POST", {
          turnover_id: "t-1",
          filename: "photo.jpg",
          content_type: "image/jpeg",
          file_size: 5000,
        })
      );
      expect(presignRes.status).toBe(200);

      // Step 3: Confirm photo as assigned cleaner
      mockDb.select
        .mockReturnValueOnce(chainable([turnoverLookup]))
        .mockReturnValueOnce(
          chainable([
            {
              propertyId: "p-1",
              userId: assignedCleanerSession.userId,
            },
          ])
        )
        .mockReturnValueOnce(
          chainable([{ id: "a-1", propertyId: "p-1" }])
        );

      mockDb.insert.mockReturnValue(insertChain(fakePhoto()));
      mockDb.update.mockReturnValue(updateChain());

      const confirmRes = await ConfirmPOST(
        makeReq("http://localhost:3000/api/photos/confirm", "POST", {
          r2_key: "org-1/p-1/t-1/photo.jpg",
          turnover_id: "t-1",
          photo_set: "post_checkout",
          area_id: "a-1",
          original_filename: "photo.jpg",
          file_size_bytes: 5000,
          mime_type: "image/jpeg",
          is_damage_flagged: false,
          damage_note: null,
        })
      );
      expect(confirmRes.status).toBe(201);
    });
  });

  describe("Unassigned cleaner is blocked", () => {
    it("unassigned cleaner cannot presign uploads", async () => {
      mockGetApiSession.mockResolvedValue(unassignedCleanerSession);
      mockIsOwner.mockReturnValue(false);

      // Turnover exists, but assignment check returns empty
      mockDb.select
        .mockReturnValueOnce(chainable([turnoverLookup]))
        .mockReturnValueOnce(chainable([]));

      const res = await PresignPOST(
        makeReq("http://localhost:3000/api/photos/presign", "POST", {
          turnover_id: "t-1",
          filename: "photo.jpg",
          content_type: "image/jpeg",
          file_size: 5000,
        })
      );
      expect(res.status).toBe(403);
    });

    it("unassigned cleaner cannot create turnovers on unassigned property", async () => {
      mockGetApiSession.mockResolvedValue(unassignedCleanerSession);
      mockIsOwner.mockReturnValue(false);

      // Property exists
      mockDb.select
        .mockReturnValueOnce(
          chainable([{ id: "p-1", orgId: "org-1", name: "Beach House" }])
        )
        // Assignment check returns empty
        .mockReturnValueOnce(chainable([]));

      const res = await TurnoversPOST(
        makeReq("http://localhost:3000/api/turnovers", "POST", {
          property_id: "p-1",
          checkout_date: "2025-03-01",
          checkin_date: "2025-03-02",
        })
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Viewer permissions", () => {
    it("viewer can read turnover detail", async () => {
      mockGetApiSession.mockResolvedValue(viewerSession);
      mockIsOwner.mockReturnValue(false);

      const turnover = fakeTurnover({ propertyName: "Beach House" });
      mockDb.select
        .mockReturnValueOnce(chainable([turnover]))
        .mockReturnValueOnce(chainable([]))
        .mockReturnValueOnce(chainable([]));

      const res = await TurnoverGET(
        makeReq("http://localhost:3000/api/turnovers/t-1", "GET"),
        makeParams()
      );
      expect(res.status).toBe(200);
    });

    it("viewer cannot update turnover (not owner or creator)", async () => {
      mockGetApiSession.mockResolvedValue(viewerSession);
      mockIsOwner.mockReturnValue(false);

      // Turnover created by someone else
      const turnover = fakeTurnover({ createdBy: "user-owner" });
      mockDb.select.mockReturnValue(chainable([turnover]));

      const res = await TurnoverPATCH(
        makeReq("http://localhost:3000/api/turnovers/t-1", "PATCH", {
          status: "complete",
        }),
        makeParams()
      );
      expect(res.status).toBe(403);
    });

    it("viewer cannot delete turnovers", async () => {
      mockGetApiSession.mockResolvedValue(viewerSession);
      mockIsOwner.mockReturnValue(false);

      const res = await TurnoverDELETE(
        makeReq("http://localhost:3000/api/turnovers/t-1", "DELETE"),
        makeParams()
      );
      expect(res.status).toBe(403);
    });
  });

  describe("Cross-org isolation", () => {
    it("cross-org user cannot access turnover detail", async () => {
      mockGetApiSession.mockResolvedValue(crossOrgSession);
      mockIsOwner.mockReturnValue(true);

      // Turnover exists but belongs to org-1, not org-other
      const turnover = fakeTurnover({ propertyOrgId: "org-1" });
      mockDb.select.mockReturnValue(chainable([turnover]));

      const res = await TurnoverGET(
        makeReq("http://localhost:3000/api/turnovers/t-1", "GET"),
        makeParams()
      );
      expect(res.status).toBe(404);
    });

    it("cross-org user cannot presign uploads", async () => {
      mockGetApiSession.mockResolvedValue(crossOrgSession);
      mockIsOwner.mockReturnValue(true);

      mockDb.select.mockReturnValue(
        chainable([{ ...turnoverLookup, propertyOrgId: "org-1" }])
      );

      const res = await PresignPOST(
        makeReq("http://localhost:3000/api/photos/presign", "POST", {
          turnover_id: "t-1",
          filename: "photo.jpg",
          content_type: "image/jpeg",
          file_size: 5000,
        })
      );
      expect(res.status).toBe(404);
    });

    it("cross-org owner cannot delete turnovers from another org", async () => {
      mockGetApiSession.mockResolvedValue(crossOrgSession);
      mockIsOwner.mockReturnValue(true);

      // getTurnoverWithAccess returns null due to org mismatch
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

  describe("Assigned cleaner full access surface", () => {
    it("can presign + confirm + read detail, but cannot PATCH or DELETE", async () => {
      mockGetApiSession.mockResolvedValue(assignedCleanerSession);
      mockIsOwner.mockReturnValue(false);

      // 1. Presign — should succeed
      mockDb.select
        .mockReturnValueOnce(chainable([turnoverLookup]))
        .mockReturnValueOnce(
          chainable([
            {
              propertyId: "p-1",
              userId: assignedCleanerSession.userId,
            },
          ])
        );

      const presignRes = await PresignPOST(
        makeReq("http://localhost:3000/api/photos/presign", "POST", {
          turnover_id: "t-1",
          filename: "photo.jpg",
          content_type: "image/jpeg",
          file_size: 5000,
        })
      );
      expect(presignRes.status).toBe(200);

      // 2. GET detail — should succeed (cleaner assigned)
      const turnover = fakeTurnover();
      mockDb.select
        .mockReturnValueOnce(chainable([turnover]))
        .mockReturnValueOnce(
          chainable([
            {
              propertyId: "p-1",
              userId: assignedCleanerSession.userId,
            },
          ])
        )
        .mockReturnValueOnce(chainable([]))
        .mockReturnValueOnce(chainable([]));

      const getRes = await TurnoverGET(
        makeReq("http://localhost:3000/api/turnovers/t-1", "GET"),
        makeParams()
      );
      expect(getRes.status).toBe(200);

      // 3. PATCH — should fail (cleaner is not owner and not creator)
      const turnoverNotCreator = fakeTurnover({
        createdBy: "user-owner",
      });
      mockDb.select
        .mockReturnValueOnce(chainable([turnoverNotCreator]))
        .mockReturnValueOnce(
          chainable([
            {
              propertyId: "p-1",
              userId: assignedCleanerSession.userId,
            },
          ])
        );

      const patchRes = await TurnoverPATCH(
        makeReq("http://localhost:3000/api/turnovers/t-1", "PATCH", {
          status: "complete",
        }),
        makeParams()
      );
      expect(patchRes.status).toBe(403);

      // 4. DELETE — should fail (cleaner, not owner)
      const deleteRes = await TurnoverDELETE(
        makeReq("http://localhost:3000/api/turnovers/t-1", "DELETE"),
        makeParams()
      );
      expect(deleteRes.status).toBe(403);
    });
  });
});
