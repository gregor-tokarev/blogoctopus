## This is template for Nuxt 3 project

It includes:

- drizzle orm
- better-auth(google oauth + magic link)
- resend
- shadcn-vue
- MinIO S3 integration for image uploads

Code:

- Basic auth page(don't forget to change name)
- Post creation with image upload support

## Features

### Image Upload in Posts
- **Paste images** from clipboard (Ctrl+V / Cmd+V)
- **Drag and drop** images directly into the upload area
- **Click to browse** and select images from your device
- **Image preview** with ability to remove images before saving
- Automatic upload to MinIO S3
- Support for JPEG, PNG, GIF, and WebP formats
- Maximum file size: 10MB per image

## Setup

### MinIO S3 Configuration
Add these environment variables to your `.env` file:

```env
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=blog-images
MINIO_USE_SSL=false
```

### Setting up MinIO:
1. **Run MinIO locally** (using Docker):
   ```bash
   docker run -p 9000:9000 -p 9001:9001 \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     minio/minio server /data --console-address ":9001"
   ```

2. **Create a bucket**:
   - Access MinIO console at http://localhost:9001
   - Login with minioadmin/minioadmin
   - Create a bucket named `blog-images`
   - Set the bucket policy to public read (or configure as needed)

3. **Configure bucket policy** for public access:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": "*",
         "Action": ["s3:GetObject"],
         "Resource": ["arn:aws:s3:::blog-images/*"]
       }
     ]
   }
   ```
