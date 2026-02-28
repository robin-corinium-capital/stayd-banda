import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSend, mockGetSignedUrl } = vi.hoisted(() => {
  process.env.R2_ENDPOINT = "https://r2.example.com";
  process.env.R2_ACCESS_KEY_ID = "test-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.R2_BUCKET_NAME = "test-bucket";
  return {
    mockSend: vi.fn(),
    mockGetSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com"),
  };
});

vi.mock("@aws-sdk/client-s3", () => {
  class S3Client { send = mockSend; }
  class PutObjectCommand { constructor(public input: unknown) {} }
  class GetObjectCommand { constructor(public input: unknown) {} }
  class DeleteObjectCommand { constructor(public input: unknown) {} }
  return { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteObject,
} from "../r2";

describe("r2 storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue("https://signed-url.example.com");
  });

  describe("getPresignedUploadUrl", () => {
    it("passes correct params and returns signed URL", async () => {
      const url = await getPresignedUploadUrl("photos/abc.jpg", "image/jpeg", 5_000_000);

      const command = mockGetSignedUrl.mock.calls[0][1];
      expect(command.input).toEqual({
        Bucket: "test-bucket",
        Key: "photos/abc.jpg",
        ContentType: "image/jpeg",
        ContentLength: 5_000_000,
      });
      expect(url).toBe("https://signed-url.example.com");
    });

    it("uses 15 minute expiry", async () => {
      await getPresignedUploadUrl("key", "image/png", 1000);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 900 },
      );
    });
  });

  describe("getPresignedDownloadUrl", () => {
    it("passes correct key and returns signed URL", async () => {
      const url = await getPresignedDownloadUrl("photos/abc.jpg");

      const command = mockGetSignedUrl.mock.calls[0][1];
      expect(command.input).toEqual({
        Bucket: "test-bucket",
        Key: "photos/abc.jpg",
      });
      expect(url).toBe("https://signed-url.example.com");
    });

    it("uses 1 hour expiry", async () => {
      await getPresignedDownloadUrl("key");
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });
  });

  describe("deleteObject", () => {
    it("sends delete command with correct key", async () => {
      await deleteObject("photos/abc.jpg");

      const command = mockSend.mock.calls[0][0];
      expect(command.input).toEqual({
        Bucket: "test-bucket",
        Key: "photos/abc.jpg",
      });
    });
  });
});
