import { z } from 'zod';

// Schema for the response when initiating LinkedIn connection (e.g., returning auth URL)
export const linkedinConnectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  authUrl: z.string().url().optional(), // URL to redirect user for LinkedIn OAuth
});

// Schema for the response when checking LinkedIn connection status
export const linkedinStatusResponseSchema = z.object({
  connected: z.boolean(),
  profileId: z.string().optional(), // Optional: LinkedIn profile ID if connected
});

// Schema for the response when disconnecting LinkedIn
export const linkedinDisconnectResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Schema for the callback from LinkedIn OAuth
export const linkedinCallbackRequestSchema = z.object({
  code: z.string(), // Authorization code from LinkedIn
  state: z.string().optional(), // Optional state parameter for security
});
