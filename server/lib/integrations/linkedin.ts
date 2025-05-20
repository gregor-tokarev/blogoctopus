import { db } from '~/server/lib/db';
import { linkedinIntegrations } from '~/server/schema';
import { eq } from 'drizzle-orm';
import type { IntegrationService, PostContent, PostResponse, FileAttachment } from './index';
import { serverEnv } from '~/env/server';

// Helper function to get LinkedIn credentials for a user
async function getLinkedinCredentials(userId: string): Promise<{ accessToken: string, profileId?: string } | null> {
  const integration = await db
    .select()
    .from(linkedinIntegrations)
    .where(eq(linkedinIntegrations.userId, userId))
    .limit(1)
    .then(results => results[0] || null);
  if (!integration || !integration.accessToken) {
    return null;
  }
  // TODO: Check if access token is expired and refresh if necessary (once refresh tokens are handled)
  return { 
    accessToken: integration.accessToken, 
    profileId: integration.profileId // Assuming profileData.id is the LinkedIn URN/person ID
  };
}

export class LinkedInIntegrationService implements IntegrationService {
  name = 'linkedin';

  public async createPost(userId: string, content: PostContent): Promise<PostResponse> {
    const credentials = await getLinkedinCredentials(userId);
    if (!credentials || !credentials.profileId) {
      return { success: false, error: 'LinkedIn integration not found, token, or profile ID missing.' };
    }

    const { accessToken, profileId } = credentials;
    const authorUrn = `urn:li:person:${profileId}`;

    const postBody: any = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content.text,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };
    
    if (content.title && (content.images?.length || content.videos?.length)) {
        postBody.specificContent['com.linkedin.ugc.ShareContent'].title = content.title;
    }

    if (content.images && content.images.length > 0) {
      const image = content.images[0]; // LinkedIn UGC posts typically handle one primary image/video well.
                                    // For multiple images, an ARTICLE share is more appropriate.
      const registerUploadRequest = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      };

      let uploadUrl = '';
      let imageAssetUrn = '';

      try {
        const registerResponse = await $fetch<any>('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': serverEnv.LINKEDIN_API_VERSION || '202405',
          },
          body: registerUploadRequest,
        });
        uploadUrl = registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploadMechanism.TransferEncoding'].uploadUrl;
        imageAssetUrn = registerResponse.value.asset;
      } catch (e: any) {
        console.error('LinkedIn image registration failed:', e.response?._data ?? e.message);
        return { success: false, error: 'LinkedIn image registration failed.', details: e.response?._data ?? e.message };
      }

      try {
        // Ensure buffer is correctly passed
        const imageBuffer = Buffer.isBuffer(image.buffer) ? image.buffer : Buffer.from(image.buffer);
        await $fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            // 'Authorization': `Bearer ${accessToken}`, // LinkedIn docs say this might not be needed for the upload to S3 step
            'Content-Type': image.mimeType,
          },
          body: imageBuffer,
        });
      } catch (e: any) {
        console.error('LinkedIn image upload failed:', e.response?._data ?? e.message);
        return { success: false, error: 'LinkedIn image upload failed.', details: e.response?._data ?? e.message };
      }

      postBody.specificContent['com.linkedin.ugc.ShareContent'].media = [
        {
          status: 'READY',
          media: imageAssetUrn,
          title: content.title ?? image.filename, // Use PostContent title or fallback to filename
        },
      ];
      postBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
    } else if (content.videos && content.videos.length > 0) {
      // Video upload is similar: register, upload, then include asset URN.
      // Recipes: urn:li:digitalmediaRecipe:feedshare-video
      // For brevity, not fully implemented here but follows the image pattern.
      return { success: false, error: 'Video posting for LinkedIn is not fully implemented in this stub.' };
    }

    try {
      const response = await $fetch<any>('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': serverEnv.LINKEDIN_API_VERSION || '202405',
        },
        body: postBody,
      });

      return {
        success: true,
        postId: response.id, 
        postUrl: `https://www.linkedin.com/feed/update/${response.id}`,
      };
    } catch (e: any) {
      console.error('LinkedIn post creation failed:', e.response?._data ?? e.message);
      let errorMessage = 'Failed to create post on LinkedIn.';
      if (e.response?._data?.message) {
        errorMessage = e.response._data.message;
      }
      return { success: false, error: errorMessage, details: e.response?._data ?? e.message };
    }
  }

  public async editPost(userId: string, postId: string, content: PostContent): Promise<PostResponse> {
    const credentials = await getLinkedinCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'LinkedIn integration not found or token missing.' };
    }
    const { accessToken } = credentials;

    const patchBody = {
      patch: {
        $set: {
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                 text: content.text,
              },
              // Potentially add title if it's part of the editable fields and was provided
              ...(content.title && { title: content.title })
            },
          },
        },
      },
    };

    try {
      await $fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
        method: 'POST', 
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'X-Restli-Method': 'PARTIAL_UPDATE',
          'LinkedIn-Version': serverEnv.LINKEDIN_API_VERSION || '202405',
        },
        body: patchBody,
      });
      return { 
        success: true, 
        postId: postId,
        postUrl: `https://www.linkedin.com/feed/update/${postId}`
      };
    } catch (e: any) {
      console.error('LinkedIn post edit failed:', e.response?._data ?? e.message);
      let errorMessage = 'Failed to edit post on LinkedIn.';
      if (e.response?._data?.message) {
        errorMessage = e.response._data.message;
      }
      return { success: false, error: errorMessage, details: e.response?._data ?? e.message };
    }
  }

  public async deletePost(userId: string, postId: string): Promise<PostResponse> {
    const credentials = await getLinkedinCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'LinkedIn integration not found or token missing.' };
    }
    const { accessToken } = credentials;

    try {
      await $fetch(`https://api.linkedin.com/v2/ugcPosts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': serverEnv.LINKEDIN_API_VERSION || '202405',
        },
      });
      return { success: true, postId: postId };
    } catch (e: any) {
      console.error('LinkedIn post deletion failed:', e.response?._data ?? e.message);
      let errorMessage = 'Failed to delete post on LinkedIn.';
      if (e.response?._data?.message) {
        errorMessage = e.response._data.message;
      }
      return { success: false, error: errorMessage, details: e.response?._data ?? e.message };
    }
  }
}

export const linkedinIntegrationService = new LinkedInIntegrationService();
