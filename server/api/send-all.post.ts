import { auth } from '~/server/lib/better-auth';
import type { PostContent, PostResponse } from '~/server/lib/integrations';
import { linkedinIntegrationService } from '~/server/lib/integrations/linkedin';
import { telegramIntegrationService } from '~/server/lib/integrations/telegram';

interface SendAllResult {
  platform: 'telegram' | 'linkedin';
  status: 'fulfilled' | 'rejected';
  value?: PostResponse;
  reason?: any;
}

export default defineEventHandler(async (event) => {
  const content = await readBody<PostContent>(event);

  const session = await auth.api.getSession(toWebRequest(event));

  if (!session?.user?.id) {
    event.node.res.statusCode = 401;
    return { success: false, error: 'User not authenticated or user ID not found.' };
  }

  const userId = session.user.id;

  try {

    if (!content || (!content.text && !content.images?.length && !content.videos?.length && !content.otherFiles?.length)) {
      event.node.res.statusCode = 400;
      return { success: false, error: 'Post content cannot be empty.' };
    }

    const results = await Promise.allSettled([
      telegramIntegrationService.createPost(userId, content),
      linkedinIntegrationService.createPost(userId, content)
    ]);

    const response: { telegram?: PostResponse, linkedin?: PostResponse, errors: any[] } = {
      errors: []
    };
    let overallSuccess = true;

    results.forEach((result, index) => {
      const platform = index === 0 ? 'telegram' : 'linkedin';
      if (result.status === 'fulfilled') {
        response[platform] = result.value;
        if (!result.value.success) {
          overallSuccess = false;
          response.errors.push({ platform, error: result.value.error, details: result.value.details });
        }
      } else {
        overallSuccess = false;
        response[platform] = { success: false, error: `Failed to post to ${platform}` };
        response.errors.push({ platform, error: result.reason?.message || result.reason || `Unknown error posting to ${platform}`, details: result.reason });
        console.error(`Error posting to ${platform}:`, result.reason);
      }
    });

    // Determine overall status code based on individual results
    if (!overallSuccess && response.errors.length > 0) {
        // If any platform failed, but some might have succeeded, return 207 Multi-Status or 500 if all failed
        const allFailed = results.every(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
        event.node.res.statusCode = allFailed ? 500 : 207; 
    } else {
        event.node.res.statusCode = 200;
    }

    return response;

  } catch (error: any) {
    console.error('Error in send-all endpoint:', error);
    event.node.res.statusCode = 500;
    return {
      telegram: { success: false, error: 'Failed due to an unexpected error.' },
      linkedin: { success: false, error: 'Failed due to an unexpected error.' },
      errors: [{ platform: 'general', error: error.message || 'An unexpected server error occurred.' }]
    };
  }
});
