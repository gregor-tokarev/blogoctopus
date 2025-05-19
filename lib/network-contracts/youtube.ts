import { z } from 'zod';

// Schema for the response when initiating YouTube connection (e.g., returning auth URL)
export const youtubeConnectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  authUrl: z.string().url().optional(), // URL to redirect user for YouTube OAuth
});

// Schema for the response when checking YouTube connection status
export const youtubeStatusResponseSchema = z.object({
  isConnected: z.boolean(),
  channelId: z.string().optional(), // Optional: YouTube channel ID if connected
  channelTitle: z.string().optional(), // Optional: YouTube channel title if connected
});

// Schema for the response when disconnecting YouTube
export const youtubeDisconnectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Schema for the callback from YouTube OAuth
export const youtubeCallbackRequestSchema = z.object({
  code: z.string(), // Authorization code from YouTube
  state: z.string().optional(), // Optional state parameter for security
});
