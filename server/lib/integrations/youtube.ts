import { db } from '~/server/lib/db';
import { youtubeIntegrations } from '~/server/schema';
import { eq } from 'drizzle-orm';
import type { IntegrationService, PostContent, PostResponse, FileAttachment } from './index';
import { serverEnv } from '~/env/server';

// Helper function to get YouTube credentials for a user
async function getYoutubeCredentials(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  channelId: string;
  expiresAt: Date;
} | null> {
  const integration = await db
    .select()
    .from(youtubeIntegrations)
    .where(eq(youtubeIntegrations.userId, userId))
    .limit(1)
    .then(results => results[0] || null);

  if (!integration || !integration.accessToken || !integration.channelId) {
    return null;
  }

  // Check if the token is expired or will expire soon
  if (new Date() >= integration.expiresAt) {
    // Token is expired, need to refresh it
    try {
      const refreshedToken = await refreshAccessToken(integration.refreshToken);
      if (refreshedToken) {
        // Update the database with the new access token
        await db
          .update(youtubeIntegrations)
          .set({
            accessToken: refreshedToken.accessToken,
            expiresAt: refreshedToken.expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(youtubeIntegrations.userId, userId))
          .execute();

        return {
          accessToken: refreshedToken.accessToken,
          refreshToken: integration.refreshToken,
          channelId: integration.channelId,
          expiresAt: refreshedToken.expiresAt,
        };
      }
    } catch (error) {
      console.error('Failed to refresh YouTube token:', error);
      return null;
    }
  }

  return {
    accessToken: integration.accessToken,
    refreshToken: integration.refreshToken,
    channelId: integration.channelId,
    expiresAt: integration.expiresAt,
  };
}

// Helper function to refresh the YouTube access token
async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date } | null> {
  try {
    const response = await $fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: serverEnv.YOUTUBE_CLIENT_ID,
        client_secret: serverEnv.YOUTUBE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    // @ts-ignore
    const { access_token, expires_in } = response;
    if (!access_token) return null;

    return {
      accessToken: access_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    };
  } catch (error) {
    console.error('Error refreshing YouTube token:', error);
    return null;
  }
}

export class YouTubeIntegrationService implements IntegrationService {
  public async createPost(userId: string, content: PostContent): Promise<PostResponse> {
    const credentials = await getYoutubeCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'YouTube integration not found or credentials missing.' };
    }

    const { accessToken, channelId } = credentials;

    // For YouTube community posts, we need at least text content
    if (!content.text) {
      return { success: false, error: 'Text content is required for YouTube community posts.' };
    }

    try {
      // Prepare the community post content
      let postBody: any = {
        snippet: {
          channelId: channelId,
          communityPost: {
            content: content.text
          }
        }
      };

      // Add image attachments if available
      if (content.images?.length) {
        // We'll use the first image for the post
        const image = content.images[0];
        
        // 1. First, upload the image to YouTube's servers
        const uploadResponse = await $fetch(`https://www.googleapis.com/upload/youtube/v3/channelPosts/images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': image.mimeType,
            'Content-Length': image.buffer.length.toString(),
          },
          body: image.buffer,
        });
        
        // @ts-ignore
        const imageUrl = uploadResponse?.url;
        
        if (imageUrl) {
          // Add the image to the community post
          postBody.snippet.communityPost.attachments = [{
            image: {
              source: {
                url: imageUrl
              }
            }
          }];
        }
      }
      
      // Create the community post
      const response = await $fetch('https://www.googleapis.com/youtube/v3/channelPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: postBody,
      });

      // @ts-ignore
      const postId = response?.id;

      if (!postId) {
        return { success: false, error: 'Failed to create community post on YouTube.' };
      }

      const postUrl = `https://www.youtube.com/channel/${channelId}/community/${postId}`;

      return {
        success: true,
        postId: postId,
        postUrl: postUrl,
      };
    } catch (e: any) {
      console.error('YouTube post creation failed:', e);
      return { 
        success: false, 
        error: e.message ?? 'Failed to create post on YouTube.',
        details: e.response?._data ?? e.message
      };
    }
  }

  public async editPost(userId: string, postId: string, content: PostContent): Promise<PostResponse> {
    const credentials = await getYoutubeCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'YouTube integration not found or credentials missing.' };
    }

    const { accessToken, channelId } = credentials;

    if (!content.text) {
      return { success: false, error: 'Text content is required for YouTube community posts.' };
    }

    try {
      // Note: YouTube doesn't actually support editing community posts via the API
      // The common approach is to delete the original post and create a new one
      // We'll first try to delete the existing post
      const deleteResult = await this.deletePost(userId, postId);
      
      if (!deleteResult.success) {
        return { 
          success: false, 
          error: 'Could not update the community post. ' + (deleteResult.error ?? 'Failed to delete the original post.')
        };
      }
      
      // Then create a new post with the updated content
      const createResult = await this.createPost(userId, content);
      
      if (!createResult.success) {
        return { 
          success: false, 
          error: 'Could not recreate the community post with updated content. ' + (createResult.error ?? '')
        };
      }
      
      return {
        success: true,
        postId: createResult.postId,
        postUrl: createResult.postUrl,
        // Add a note to indicate this was done through delete-and-recreate
        details: { note: 'YouTube does not support direct edits to community posts. The original post was deleted and a new one was created.' }
      };
    } catch (e: any) {
      console.error('YouTube community post update failed:', e);
      return { 
        success: false, 
        error: e.message ?? 'Failed to update community post on YouTube.',
        details: e.response?._data ?? e.message
      };
    }
  }

  public async deletePost(userId: string, postId: string): Promise<PostResponse> {
    const credentials = await getYoutubeCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'YouTube integration not found or credentials missing.' };
    }

    const { accessToken } = credentials;

    try {
      // Delete the community post
      await $fetch(`https://www.googleapis.com/youtube/v3/channelPosts`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          id: postId
        }
      });

      return { success: true, postId: postId };
    } catch (e: any) {
      console.error('YouTube community post deletion failed:', e);
      return { 
        success: false, 
        error: e.message ?? 'Failed to delete community post from YouTube.',
        details: e.response?._data ?? e.message
      };
    }
  }

  // Method to get comments from a YouTube community post
  public async getComments(userId: string, postId: string): Promise<any> {
    const credentials = await getYoutubeCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'YouTube integration not found or credentials missing.' };
    }

    const { accessToken } = credentials;

    try {
      // Get comments for a community post
      const commentsResponse = await $fetch('https://www.googleapis.com/youtube/v3/comments', {
        params: {
          part: 'snippet',
          parentId: postId, // For community posts, the postId is used as the parent ID for comments
          maxResults: 50,
          textFormat: 'plainText',
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        success: true,
        comments: commentsResponse,
      };
    } catch (e: any) {
      console.error('Failed to fetch YouTube community post comments:', e);
      return { 
        success: false, 
        error: e.message ?? 'Failed to fetch comments from YouTube community post.',
        details: e.response?._data ?? e.message
      };
    }
  }

  // Method to reply to a comment on a community post
  public async replyToComment(userId: string, commentId: string, text: string): Promise<any> {
    const credentials = await getYoutubeCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'YouTube integration not found or credentials missing.' };
    }

    const { accessToken } = credentials;

    try {
      // Create a reply to an existing comment
      const response = await $fetch('https://www.googleapis.com/youtube/v3/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          snippet: {
            parentId: commentId,
            textOriginal: text,
          },
        },
      });

      return {
        success: true,
        comment: response,
      };
    } catch (e: any) {
      console.error('Failed to reply to YouTube community post comment:', e);
      return { 
        success: false, 
        error: e.message ?? 'Failed to reply to comment on YouTube community post.',
        details: e.response?._data ?? e.message
      };
    }
  }
  
  // Method to get comment threads on a community post
  public async getCommentThreads(userId: string, postId: string): Promise<any> {
    const credentials = await getYoutubeCredentials(userId);
    if (!credentials) {
      return { success: false, error: 'YouTube integration not found or credentials missing.' };
    }

    const { accessToken } = credentials;

    try {
      // Get comment threads for a community post
      const threadsResponse = await $fetch('https://www.googleapis.com/youtube/v3/commentThreads', {
        params: {
          part: 'snippet,replies',
          channelPostId: postId, // For community posts, use channelPostId instead of videoId
          maxResults: 50,
          textFormat: 'plainText',
          moderationStatus: 'published',
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        success: true,
        commentThreads: threadsResponse,
      };
    } catch (e: any) {
      console.error('Failed to fetch YouTube community post comment threads:', e);
      return { 
        success: false, 
        error: e.message ?? 'Failed to fetch comment threads from YouTube community post.',
        details: e.response?._data ?? e.message
      };
    }
  }
}

export const youtubeIntegrationService = new YouTubeIntegrationService();
