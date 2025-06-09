import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readMultipartFormData } from "h3";
import { serverEnv } from "~/env/server";

// Initialize MinIO S3 client
const s3Client = new S3Client({
  endpoint: `http${serverEnv.MINIO_USE_SSL ? 's' : ''}://${serverEnv.MINIO_ENDPOINT}`,
  region: "us-east-1", // MinIO doesn't care about region, but AWS SDK requires it
  credentials: {
    accessKeyId: serverEnv.MINIO_ACCESS_KEY,
    secretAccessKey: serverEnv.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

// Allowed image types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default defineEventHandler(async (event) => {
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event);
    
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No file uploaded",
      });
    }

    const file = formData[0];
    
    // Validate file
    if (!file.data || !file.filename) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid file",
      });
    }

    // Check file type
    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid file type. Allowed types: JPEG, PNG, GIF, WebP",
      });
    }

    // Check file size
    if (file.data.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: "File too large. Maximum size is 10MB",
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.filename.split(".").pop() || "jpg";
    const key = `posts/${timestamp}-${randomString}.${extension}`;

    // Upload to MinIO
    const command = new PutObjectCommand({
      Bucket: serverEnv.MINIO_BUCKET_NAME,
      Key: key,
      Body: file.data,
      ContentType: contentType,
      // Optional: Add cache control and other headers
      CacheControl: "public, max-age=31536000",
    });

    await s3Client.send(command);

    // Return the MinIO URL
    const protocol = serverEnv.MINIO_USE_SSL ? "https" : "http";
    const url = `${protocol}://${serverEnv.MINIO_ENDPOINT}/${serverEnv.MINIO_BUCKET_NAME}/${key}`;

    return {
      url,
      key,
      contentType,
      size: file.data.length,
    };
  } catch (error) {
    console.error("Image upload error:", error);
    
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to upload image",
    });
  }
});