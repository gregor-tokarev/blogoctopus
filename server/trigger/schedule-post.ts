import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { telegramIntegrationService } from "../lib/integrations";
import { linkedinIntegrationService } from "../lib/integrations/linkedin";
import { z } from "zod";

const fileAttachmentSchema = z.object({
  buffer: z.instanceof(Buffer),
  filename: z.string(),
  mimeType: z.string(),
  url: z.string().url().optional(),
});

export const postContentSchema = z.object({
  text: z.string(),
  title: z.string().optional(),
  images: z.array(fileAttachmentSchema).optional(),
  videos: z.array(fileAttachmentSchema).optional(),
  otherFiles: z.array(fileAttachmentSchema).optional(),
});

export const schedulePostTask = schemaTask({
  id: "schedule-post",
  schema: z.object({
    userId: z.string(),
    content: postContentSchema,
  }),
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 1000,
    randomize: true,
  },
  run: async (payload, { ctx }) => {
    logger.info("Hello, world!", { payload, ctx });

    const platforms = [telegramIntegrationService, linkedinIntegrationService];

    const results = await Promise.allSettled(
      platforms.map((platform) =>
        platform.createPost(payload.userId, payload.content),
      ),
    );
  },
});
