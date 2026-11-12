import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class NeonStorageService {
  private readonly logger = new Logger(NeonStorageService.name);
  private readonly s3Client: S3Client | null = null;
  readonly bucketName: string;
  readonly isConfigured: boolean;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>("AWS_ENDPOINT_URL_S3");
    const region = this.config.get<string>("AWS_REGION") || "ap-southeast-1";
    const accessKeyId = this.config.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.config.get<string>("AWS_SECRET_ACCESS_KEY");
    this.bucketName = this.config.get<string>("NEON_OBJECT_STORAGE_BUCKET") || "assets";

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true, // Required for Neon Object Storage
      });
      this.isConfigured = true;
      this.logger.log(
        `Neon Object Storage configured for bucket '${this.bucketName}' at ${endpoint}`,
      );
    } else {
      this.isConfigured = false;
      this.logger.warn("Neon Object Storage credentials not fully set; storage disabled");
    }
  }

  async putObject(
    key: string,
    body: string | Uint8Array | Buffer,
    contentType = "application/octet-stream",
  ): Promise<{ key: string; bucket: string }> {
    if (!this.s3Client) {
      throw new Error("Neon Object Storage is not configured");
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: typeof body === "string" ? Buffer.from(body) : body,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    return { key, bucket: this.bucketName };
  }

  async getObject(key: string): Promise<string> {
    if (!this.s3Client) {
      throw new Error("Neon Object Storage is not configured");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error(`Empty response body for object key '${key}'`);
    }

    return response.Body.transformToString("utf-8");
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error("Neon Object Storage is not configured");
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error("Neon Object Storage is not configured");
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async checkBucket(): Promise<{ status: "connected" | "unavailable"; message?: string }> {
    if (!this.s3Client) {
      return { status: "unavailable", message: "Client not configured" };
    }

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return { status: "connected" };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      return { status: "unavailable", message: errMessage };
    }
  }
}
