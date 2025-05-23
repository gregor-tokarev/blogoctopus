import { auth } from "~/server/lib/better-auth";
import { type PostContent, type PostResponse } from "~/server/lib/integrations";
import { schedulePostTask } from "../trigger/schedule-post";

interface SendAllResult {
  platform: "telegram" | "linkedin";
  status: "fulfilled" | "rejected";
  value?: PostResponse;
  reason?: any;
}

export default defineEventHandler(async (event) => {
  const content = await readBody<PostContent>(event);

  const session = await auth.api.getSession(toWebRequest(event));

  if (!session?.user?.id) {
    event.node.res.statusCode = 401;
    return {
      success: false,
      error: "User not authenticated or user ID not found.",
    };
  }

  const userId = session.user.id;

  schedulePostTask.trigger(
    {
      userId,
      content,
    },
    { delay: new Date(Date.now() + 60 * 60 * 1000) },
  );

  return { success: true, message: "Post scheduled successfully." };
});
