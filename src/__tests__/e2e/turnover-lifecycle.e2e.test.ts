import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chainable,
  insertChain,
  updateChain,
  makeReq,
  ownerSession,
  fakeTurnover,
  fakePhoto,
  fakeProperty,
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
    mockIsOwner: vi.fn().mockReturnValue(true),
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
}));

vi.mock("sharp", () => ({ default: mockSharp }));
vi.mock("crypto", () => ({ randomUUID: mockRandomUUID }));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { POST as PropertiesPOST } from "@/app/api/properties/route";
import { POST as TurnoversPOST } from "@/app/api/turnovers/route";
import { POST as PresignPOST } from "@/app/api/photos/presign/route";
import { POST as ConfirmPOST } from "@/app/api/photos/confirm/route";
import {
  GET as TurnoverGET,
  PATCH as TurnoverPATCH,
} from "@/app/api/turnovers/[id]/route";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Turnover Lifecycle E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiSession.mockResolvedValue(ownerSession);
    mockIsAuthError.mockReturnValue(false);
    mockIsOwner.mockReturnValue(true);
  });

  describe("Create property -> create turnover -> upload photo -> complete", () => {
    it("property ID from creation flows into turnover creation", async () => {
      // Step 1: Create property
      const prop = fakeProperty({ id: "p-new" });
      mockDb.insert.mockReturnValue(insertChain(prop));

      const propRes = await PropertiesPOST(
        makeReq("http://localhost:3000/api/properties", "POST", {
          name: "Beach House",
          address: "123 Beach Rd",
        })
      );
      expect(propRes.status).toBe(201);
      const propJson = await propRes.json();
      expect(propJson.id).toBe("p-new");

      // Step 2: Create turnover using that property ID
      const turnover = fakeTurnover({ id: "t-new", propertyId: "p-new" });

      // Turnovers POST: first selects property to verify it exists
      mockDb.select.mockReturnValue(
        chainable([{ id: "p-new", orgId: "org-1", name: "Beach House" }])
      );
      mockDb.insert.mockReturnValue(insertChain(turnover));

      const turnoverRes = await TurnoversPOST(
        makeReq("http://localhost:3000/api/turnovers", "POST", {
          property_id: propJson.id,
          checkout_date: "2025-03-01",
          checkin_date: "2025-03-02",
        })
      );
      expect(turnoverRes.status).toBe(201);
      const turnoverJson = await turnoverRes.json();
      expect(turnoverJson.propertyId).toBe("p-new");
      expect(turnoverJson.status).toBe("open");
    });

    it("presign r2Key flows correctly into confirm request", async () => {
      // Step 1: Presign
      mockDb.select.mockReturnValue(
        chainable([
          {
            id: "t-1",
            propertyId: "p-1",
            propertyOrgId: "org-1",
            status: "open",
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
      const { r2Key } = await presignRes.json();
      expect(r2Key).toContain("org-1/p-1/t-1/");
      expect(r2Key).toContain(".jpg");

      // Step 2: Confirm using the r2Key from presign
      mockDb.select
        .mockReturnValueOnce(
          chainable([
            {
              id: "t-1",
              propertyId: "p-1",
              status: "open",
              propertyOrgId: "org-1",
            },
          ])
        )
        .mockReturnValueOnce(
          chainable([{ id: "a-1", propertyId: "p-1" }])
        );

      const photo = fakePhoto({ id: "ph-1", r2KeyOriginal: r2Key });
      mockDb.insert.mockReturnValue(insertChain(photo));
      mockDb.update.mockReturnValue(updateChain());

      const confirmRes = await ConfirmPOST(
        makeReq("http://localhost:3000/api/photos/confirm", "POST", {
          r2_key: r2Key,
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
      const photoJson = await confirmRes.json();
      expect(photoJson.r2KeyOriginal).toBe(r2Key);
    });
  });

  describe("Status transitions across endpoints", () => {
    it("first photo upload auto-transitions turnover from open to in_progress", async () => {
      // Confirm a photo on an "open" turnover
      mockDb.select
        .mockReturnValueOnce(
          chainable([
            {
              id: "t-1",
              propertyId: "p-1",
              status: "open",
              propertyOrgId: "org-1",
            },
          ])
        )
        .mockReturnValueOnce(
          chainable([{ id: "a-1", propertyId: "p-1" }])
        );

      mockDb.insert.mockReturnValue(insertChain(fakePhoto()));

      const uChain = updateChain();
      mockDb.update.mockReturnValue(uChain);

      await ConfirmPOST(
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

      // Verify update was called with status: "in_progress"
      expect(mockDb.update).toHaveBeenCalled();
      const setCall = (uChain.set as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(setCall.status).toBe("in_progress");
    });

    it("second photo does NOT re-trigger status transition", async () => {
      // Confirm a photo on an "in_progress" turnover
      mockDb.select
        .mockReturnValueOnce(
          chainable([
            {
              id: "t-1",
              propertyId: "p-1",
              status: "in_progress",
              propertyOrgId: "org-1",
            },
          ])
        )
        .mockReturnValueOnce(
          chainable([{ id: "a-1", propertyId: "p-1" }])
        );

      mockDb.insert.mockReturnValue(
        insertChain(fakePhoto({ id: "ph-2" }))
      );

      await ConfirmPOST(
        makeReq("http://localhost:3000/api/photos/confirm", "POST", {
          r2_key: "org-1/p-1/t-1/photo2.jpg",
          turnover_id: "t-1",
          photo_set: "post_checkout",
          area_id: "a-1",
          original_filename: "photo2.jpg",
          file_size_bytes: 5000,
          mime_type: "image/jpeg",
          is_damage_flagged: false,
          damage_note: null,
        })
      );

      // db.update should NOT have been called
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("PATCH complete sets completedAt, then presign blocks further uploads", async () => {
      // Step 1: PATCH to complete
      const turnover = fakeTurnover({ status: "in_progress" });
      mockDb.select.mockReturnValue(chainable([turnover]));

      const updatedTurnover = {
        ...turnover,
        status: "complete",
        completedAt: new Date(),
      };
      const uChain = updateChain(updatedTurnover);
      mockDb.update.mockReturnValue(uChain);

      const patchRes = await TurnoverPATCH(
        makeReq("http://localhost:3000/api/turnovers/t-1", "PATCH", {
          status: "complete",
        }),
        { params: Promise.resolve({ id: "t-1" }) }
      );
      expect(patchRes.status).toBe(200);

      // Verify completedAt was set
      const setCall = (uChain.set as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(setCall.status).toBe("complete");
      expect(setCall.completedAt).toBeInstanceOf(Date);

      // Step 2: Presign should now block uploads
      mockDb.select.mockReturnValue(
        chainable([
          {
            id: "t-1",
            propertyId: "p-1",
            propertyOrgId: "org-1",
            status: "complete",
          },
        ])
      );

      const presignRes = await PresignPOST(
        makeReq("http://localhost:3000/api/photos/presign", "POST", {
          turnover_id: "t-1",
          filename: "late-photo.jpg",
          content_type: "image/jpeg",
          file_size: 5000,
        })
      );
      expect(presignRes.status).toBe(400);
      const json = await presignRes.json();
      expect(json.error).toContain("complete");
    });
  });

  describe("Detail endpoint aggregates data from prior steps", () => {
    it("GET turnover detail returns areas and grouped photos after uploads", async () => {
      const turnover = fakeTurnover({
        status: "in_progress",
        propertyName: "Beach House",
      });

      mockDb.select
        // Turnover lookup
        .mockReturnValueOnce(chainable([turnover]))
        // Areas
        .mockReturnValueOnce(
          chainable([
            { id: "a-1", name: "Kitchen", sortOrder: 0 },
            { id: "a-2", name: "Bathroom", sortOrder: 1 },
          ])
        )
        // Photos
        .mockReturnValueOnce(
          chainable([
            {
              id: "ph-1",
              photoSet: "post_checkout",
              areaId: "a-1",
              uploadTimestamp: "2025-03-01T10:00:00Z",
            },
            {
              id: "ph-2",
              photoSet: "pre_checkin",
              areaId: "a-1",
              uploadTimestamp: "2025-03-01T11:00:00Z",
            },
            {
              id: "ph-3",
              photoSet: "post_checkout",
              areaId: null,
              uploadTimestamp: "2025-03-01T12:00:00Z",
            },
          ])
        );

      const res = await TurnoverGET(
        makeReq("http://localhost:3000/api/turnovers/t-1", "GET"),
        { params: Promise.resolve({ id: "t-1" }) }
      );
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.propertyName).toBe("Beach House");
      expect(json.areas).toHaveLength(2);
      expect(json.totalPhotos).toBe(3);
      expect(json.photos.post_checkout).toHaveLength(2);
      expect(json.photos.pre_checkin).toHaveLength(1);
    });
  });
});
