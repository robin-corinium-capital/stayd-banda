import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  insertChain,
  updateChain,
  makeReq,
  ownerSession,
  assignedCleanerSession,
  crossOrgSession,
  fakePhoto,
  createSchemaMock,
} from "./helpers";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const {
  mockGetApiSession,
  mockIsAuthError,
  mockDb,
  mockGetObject,
  mockPutObject,
  mockGetPresignedDownloadUrl,
  mockGetTurnoverWithAccess,
  mockGetTurnoverPhotos,
  mockSanitiseFilename,
  mockSharp,
  MockPassThroughInstance,
  mockArchiver,
} = vi.hoisted(() => {
  const sharpInstance = {
    metadata: vi.fn().mockResolvedValue({ format: "jpeg", exif: null }),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("thumb-data")),
  };

  const mockPT = {
    on: vi.fn(),
    destroy: vi.fn(),
  };

  const mockArch = {
    on: vi.fn(),
    pipe: vi.fn(),
    append: vi.fn(),
    finalize: vi.fn().mockResolvedValue(undefined),
  };

  return {
    mockGetApiSession: vi.fn(),
    mockIsAuthError: vi.fn().mockReturnValue(false),
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
    mockGetObject: vi.fn().mockResolvedValue(Buffer.from("fake-image-data")),
    mockPutObject: vi.fn().mockResolvedValue(undefined),
    mockGetPresignedDownloadUrl: vi
      .fn()
      .mockResolvedValue("https://r2.example.com/thumb"),
    mockGetTurnoverWithAccess: vi.fn(),
    mockGetTurnoverPhotos: vi.fn(),
    mockSanitiseFilename: vi.fn((str: string) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    ),
    mockSharp: Object.assign(vi.fn().mockReturnValue(sharpInstance), {
      _instance: sharpInstance,
    }),
    MockPassThroughInstance: mockPT,
    mockArchiver: vi.fn(() => mockArch),
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  getApiSession: mockGetApiSession,
  isAuthError: mockIsAuthError,
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => createSchemaMock());

vi.mock("@/lib/r2", () => ({
  getObject: mockGetObject,
  putObject: mockPutObject,
  getPresignedDownloadUrl: mockGetPresignedDownloadUrl,
}));

vi.mock("@/lib/export-helpers", () => ({
  getTurnoverWithAccess: mockGetTurnoverWithAccess,
  getTurnoverPhotos: mockGetTurnoverPhotos,
  sanitiseFilename: mockSanitiseFilename,
}));

vi.mock("sharp", () => ({ default: mockSharp }));

vi.mock("archiver", () => ({ default: mockArchiver }));

vi.mock("stream", () => ({
  PassThrough: function () {
    return MockPassThroughInstance;
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { POST as ConfirmPOST } from "@/app/api/photos/confirm/route";
import { GET as FlaggedGET } from "@/app/api/dashboard/flagged/route";
import { GET as ExportGET } from "@/app/api/export/turnover/[id]/route";

// ── Shared data ────────────────────────────────────────────────────────────

const turnoverLookup = {
  id: "t-1",
  propertyId: "p-1",
  status: "open",
  propertyOrgId: "org-1",
};

const fakeTurnoverForExport = {
  id: "t-1",
  propertyId: "p-1",
  checkoutDate: "2025-03-01",
  checkinDate: "2025-03-02",
  propertyName: "Beach House",
  propertyAddress: "123 Beach Rd",
  propertyOrgId: "org-1",
  status: "in_progress",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Damage Flagging Flow E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsAuthError.mockReturnValue(false);

    MockPassThroughInstance.on.mockImplementation(
      (event: string, cb: () => void) => {
        if (event === "end") {
          setTimeout(() => cb(), 0);
        }
        return MockPassThroughInstance;
      }
    );
  });

  describe("Upload flagged photos then verify dashboard and export filtering", () => {
    it("confirms flagged photo, then dashboard/flagged returns it", async () => {
      // Step 1: Confirm a flagged photo
      mockDb.select
        .mockReturnValueOnce(chainable([turnoverLookup]))
        .mockReturnValueOnce(
          chainable([{ id: "a-1", propertyId: "p-1" }])
        );

      const flaggedPhoto = fakePhoto({
        id: "ph-flagged",
        isDamageFlagged: true,
        damageNote: "Scratch on wall",
      });
      mockDb.insert.mockReturnValue(insertChain(flaggedPhoto));
      mockDb.update.mockReturnValue(updateChain());

      const confirmRes = await ConfirmPOST(
        makeReq("http://localhost:3000/api/photos/confirm", "POST", {
          r2_key: "org-1/p-1/t-1/flagged.jpg",
          turnover_id: "t-1",
          photo_set: "post_checkout",
          area_id: "a-1",
          original_filename: "scratch.jpg",
          file_size_bytes: 5000,
          mime_type: "image/jpeg",
          is_damage_flagged: true,
          damage_note: "Scratch on wall",
        })
      );
      expect(confirmRes.status).toBe(201);
      const photoJson = await confirmRes.json();
      expect(photoJson.isDamageFlagged).toBe(true);

      // Step 2: Dashboard/flagged should return the flagged photo
      // First select: properties for org
      mockDb.select
        .mockReturnValueOnce(chainable([{ id: "p-1" }]))
        // Second select: flagged photos
        .mockReturnValueOnce(
          chainable([
            {
              photoId: "ph-flagged",
              turnoverId: "t-1",
              r2KeyThumbnail: "org-1/p-1/t-1/flagged_thumb.jpg",
              damageNote: "Scratch on wall",
              uploadTimestamp: new Date().toISOString(),
              propertyName: "Beach House",
              areaName: "Kitchen",
              checkoutDate: "2025-03-01",
              checkinDate: "2025-03-02",
            },
          ])
        );

      const flaggedRes = await FlaggedGET();
      expect(flaggedRes.status).toBe(200);
      const flaggedJson = await flaggedRes.json();
      expect(flaggedJson.flaggedPhotos).toHaveLength(1);
      expect(flaggedJson.flaggedPhotos[0].damageNote).toBe(
        "Scratch on wall"
      );
      expect(flaggedJson.flaggedPhotos[0].thumbnailUrl).toBe(
        "https://r2.example.com/thumb"
      );
    });

    it("export with flagged_only=true filters to flagged photos only", async () => {
      mockGetTurnoverWithAccess.mockResolvedValue(fakeTurnoverForExport);

      const flaggedPhoto = {
        id: "ph-flagged",
        photoSet: "post_checkout",
        r2KeyOriginal: "org-1/p-1/t-1/flagged.jpg",
        r2KeyThumbnail: null,
        originalFilename: "scratch.jpg",
        mimeType: "image/jpeg",
        areaName: "Kitchen",
        isDamageFlagged: true,
        damageNote: "Scratch on wall",
      };
      mockGetTurnoverPhotos.mockResolvedValue([flaggedPhoto]);
      mockGetObject.mockResolvedValue(Buffer.from("image-data"));

      const res = await ExportGET(
        makeReq(
          "http://localhost:3000/api/export/turnover/t-1",
          "GET",
          undefined,
          { flagged_only: "true" }
        ),
        { params: Promise.resolve({ id: "t-1" }) }
      );

      expect(res.headers.get("Content-Type")).toBe("application/zip");
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain("_flagged");
      expect(disposition).toContain("beach-house");

      // Verify getTurnoverPhotos was called with flaggedOnly=true
      expect(mockGetTurnoverPhotos).toHaveBeenCalledWith("t-1", true);
    });

    it("export without flagged_only returns all photos", async () => {
      mockGetTurnoverWithAccess.mockResolvedValue(fakeTurnoverForExport);

      const allPhotos = [
        {
          id: "ph-1",
          photoSet: "post_checkout",
          r2KeyOriginal: "org-1/p-1/t-1/normal.jpg",
          originalFilename: "normal.jpg",
          mimeType: "image/jpeg",
          areaName: "Kitchen",
          isDamageFlagged: false,
        },
        {
          id: "ph-flagged",
          photoSet: "post_checkout",
          r2KeyOriginal: "org-1/p-1/t-1/flagged.jpg",
          originalFilename: "scratch.jpg",
          mimeType: "image/jpeg",
          areaName: "Kitchen",
          isDamageFlagged: true,
        },
      ];
      mockGetTurnoverPhotos.mockResolvedValue(allPhotos);
      mockGetObject.mockResolvedValue(Buffer.from("image-data"));

      const res = await ExportGET(
        makeReq(
          "http://localhost:3000/api/export/turnover/t-1",
          "GET"
        ),
        { params: Promise.resolve({ id: "t-1" }) }
      );

      expect(res.headers.get("Content-Type")).toBe("application/zip");
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).not.toContain("_flagged");

      // Verify getTurnoverPhotos was called with flaggedOnly=false
      expect(mockGetTurnoverPhotos).toHaveBeenCalledWith("t-1", false);
    });
  });

  describe("Dashboard flagged respects org and role boundaries", () => {
    it("cleaner only sees flagged photos from assigned properties", async () => {
      mockGetApiSession.mockResolvedValue(assignedCleanerSession);

      // Assignments: only p-1
      mockDb.select
        .mockReturnValueOnce(
          chainable([{ propertyId: "p-1" }])
        )
        // Flagged photos (only from p-1)
        .mockReturnValueOnce(
          chainable([
            {
              photoId: "ph-1",
              turnoverId: "t-1",
              r2KeyThumbnail: null,
              damageNote: "Stain",
              uploadTimestamp: new Date().toISOString(),
              propertyName: "Beach House",
              areaName: null,
              checkoutDate: "2025-03-01",
              checkinDate: "2025-03-02",
            },
          ])
        );

      const res = await FlaggedGET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.flaggedPhotos).toHaveLength(1);
    });

    it("cross-org user sees empty flagged list", async () => {
      mockGetApiSession.mockResolvedValue(crossOrgSession);

      // No properties in org-other
      mockDb.select.mockReturnValue(chainable([]));

      const res = await FlaggedGET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.flaggedPhotos).toEqual([]);
    });
  });
});
