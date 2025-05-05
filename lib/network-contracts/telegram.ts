import { z } from "zod";

export const sendPostSchema = z.object({
  channelName: z.string({
    required_error: "Имя канала обязательно"
  }).refine(
    (val) => val.startsWith('@') ? /^@[a-zA-Z][a-zA-Z0-9_]{3,30}$/.test(val) : /^[a-zA-Z][a-zA-Z0-9_]{3,30}$/.test(val),
    { message: "Формат канала должен быть @channel_name или channel_name" }
  )
});

export type SendPostInput = z.infer<typeof sendPostSchema>;
