## This is template for Nuxt 3 project

It includes:

- drizzle orm
- better-auth(google oauth + magic link)
- resend
- shadcn-vue
- AWS S3 integration for image uploads

Code:

- Basic auth page(don't forget to change name)
- Post creation with image upload support

## Features

### Image Upload in Posts
- **Paste images** from clipboard (Ctrl+V / Cmd+V)
- **Drag and drop** images directly into the upload area
- **Click to browse** and select images from your device
- **Image preview** with ability to remove images before saving
- Automatic upload to AWS S3
- Support for JPEG, PNG, GIF, and WebP formats
- Maximum file size: 10MB per image

## Setup

### AWS S3 Configuration
Add these environment variables to your `.env` file:

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region (e.g., us-east-1)
S3_BUCKET_NAME=your-bucket-name
```

Make sure your S3 bucket:
1. Has public read access for uploaded images
2. Has appropriate CORS configuration if needed
3. The AWS credentials have `s3:PutObject` permission for the bucket
