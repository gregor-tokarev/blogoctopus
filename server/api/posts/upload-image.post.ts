import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readMultipartFormData } from "h3";
import { serverEnv } from "~/env/server";

// Initialize S3 client
const s3Client = new S3Client({
  region: serverEnv.AWS_REGION,
  credentials: {
    accessKeyId: serverEnv.AWS_ACCESS_KEY_ID,
    secretAccessKey: serverEnv.AWS_SECRET_ACCESS_KEY,
  },
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

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: serverEnv.S3_BUCKET_NAME,
      Key: key,
      Body: file.data,
      ContentType: contentType,
      // Optional: Add cache control and other headers
      CacheControl: "public, max-age=31536000",
    });

    await s3Client.send(command);

    // Return the S3 URL
    const url = `https://${serverEnv.S3_BUCKET_NAME}.s3.${serverEnv.AWS_REGION}.amazonaws.com/${key}`;

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