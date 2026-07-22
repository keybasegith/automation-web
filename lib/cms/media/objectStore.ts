import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CmsConfigError } from "@/lib/cms/storage/backend";

/**
 * Object storage for media binaries — S3-compatible (the self-hosted
 * production storage, MinIO locally). Uploads go browser → storage via
 * presigned PUT URLs; file bodies never pass through a serverless function.
 *
 * All storage access happens through this module. Required env:
 *   MEDIA_S3_ENDPOINT           e.g. https://storage.example.com (omit for AWS)
 *   MEDIA_S3_REGION             default "us-east-1"
 *   MEDIA_S3_BUCKET
 *   MEDIA_S3_ACCESS_KEY_ID
 *   MEDIA_S3_SECRET_ACCESS_KEY
 *   MEDIA_S3_FORCE_PATH_STYLE   "true" for MinIO and most self-hosted stores
 * Plus NEXT_PUBLIC_MEDIA_BASE_URL for public reads (see lib/cms/media/url.ts).
 */

export interface MediaObjectStore {
  /** A presigned PUT URL the browser uploads the file body to directly. */
  presignUpload(args: {
    key: string;
    contentType: string;
  }): Promise<{ uploadUrl: string; expiresInSeconds: number }>;
  /** Object metadata after upload, or null if the object doesn't exist. */
  head(key: string): Promise<{ contentLength: number; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

const PRESIGN_EXPIRES_SECONDS = 300;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new CmsConfigError(
      `${name} is not set. Media storage is S3-compatible object storage and ` +
        "must be configured explicitly — there is no filesystem fallback."
    );
  }
  return value;
}

/** Boot-time validation of the media storage configuration. */
export function assertMediaStorageConfigured(): void {
  requireEnv("MEDIA_S3_BUCKET");
  requireEnv("MEDIA_S3_ACCESS_KEY_ID");
  requireEnv("MEDIA_S3_SECRET_ACCESS_KEY");
  if (!process.env.NEXT_PUBLIC_MEDIA_BASE_URL) {
    throw new CmsConfigError(
      "NEXT_PUBLIC_MEDIA_BASE_URL is not set — uploaded media could not be " +
        "rendered on the public site."
    );
  }
}

class S3MediaObjectStore implements MediaObjectStore {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = requireEnv("MEDIA_S3_BUCKET");
    this.client = new S3Client({
      endpoint: process.env.MEDIA_S3_ENDPOINT || undefined,
      region: process.env.MEDIA_S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: requireEnv("MEDIA_S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("MEDIA_S3_SECRET_ACCESS_KEY"),
      },
      forcePathStyle: process.env.MEDIA_S3_FORCE_PATH_STYLE === "true",
    });
  }

  async presignUpload(args: { key: string; contentType: string }) {
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: args.key,
        ContentType: args.contentType,
      }),
      { expiresIn: PRESIGN_EXPIRES_SECONDS }
    );
    return { uploadUrl, expiresInSeconds: PRESIGN_EXPIRES_SECONDS };
  }

  async head(key: string) {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key })
      );
      return {
        contentLength: Number(res.ContentLength ?? 0),
        contentType: res.ContentType ?? "application/octet-stream",
      };
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404 || (err as Error).name === "NotFound") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }
}

let store: S3MediaObjectStore | null = null;

export function getMediaObjectStore(): MediaObjectStore {
  if (!store) store = new S3MediaObjectStore();
  return store;
}
