import type { IntegrationService, PostContent, PostResponse } from "./index";
import { serverEnv } from "~/env/server";
import { telegramBot } from "~/server/lib/telegram";
import type {
  InputMedia,
  SendPhotoOptions,
  SendMessageOptions,
  EditMessageCaptionOptions,
  EditMessageTextOptions,
  SendVideoOptions,
  SendDocumentOptions,
} from "node-telegram-bot-api";
import { db } from "~/server/lib/db";
import { telegramIntegrations } from "~/server/schema/telegram";
import { eq } from "drizzle-orm";

// Helper to get user-specific Telegram Chat ID from DB
async function getTelegramChatIdForUser(
  userId: string
): Promise<string | null> {
  if (!userId) return null;
  try {
    const result = await db
      .select()
      .from(telegramIntegrations) // Use telegramIntegrations table
      .where(eq(telegramIntegrations.userId, userId)) // Filter only by userId
      .limit(1);

    return result[0]?.channelUsername ?? null;
  } catch (error) {
    console.error("Failed to fetch Telegram chat ID for user:", userId, error);
    return null;
  }
}

// Helper to escape MarkdownV2 special characters
function escapeMarkdownV2(text: string): string {
  if (!text) return "";
  // Escape all reserved characters for MarkdownV2
  return text.replace(/([_*[\\]()~`>#+\-=|{}.!])/g, "\\$1");
}

export class TelegramIntegrationService implements IntegrationService {
  name = 'telegram';

  public async createPost(
    userId: string,
    content: PostContent
  ): Promise<PostResponse> {
    const chatId = await getTelegramChatIdForUser(userId); // Returns string | null

    if (!chatId) {
      return {
        success: false,
        error: "Telegram Chat ID not configured for this user.",
      };
    }
    // At this point, chatId is a non-empty string from the DB

    if (!serverEnv.TELEGRAM_BOT_TOKEN) {
      return { success: false, error: "Telegram Bot Token not configured." };
    }

    try {
      let messageResult;
      const textPart = escapeMarkdownV2(content.text);
      const titlePart = content.title
        ? `*${escapeMarkdownV2(content.title)}*`
        : "";
      // Construct caption: if title exists, format as "Title\n\nText", otherwise just text.
      const caption = content.title
        ? `${titlePart}\\n\\n${textPart}`
        : textPart;
      // Use MarkdownV2 if title is present or if text contains characters that would benefit from it.
      const parseMode =
        content.title || textPart !== content.text ? "MarkdownV2" : undefined;

      const commonOptions: Partial<
        | SendPhotoOptions
        | SendVideoOptions
        | SendDocumentOptions
        | SendMessageOptions
      > = {
        caption:
          content.images?.length ||
          content.videos?.length ||
          content.otherFiles?.length
            ? caption
            : undefined,
        parse_mode: parseMode,
      };
      if (
        !(
          content.images?.length ||
          content.videos?.length ||
          content.otherFiles?.length
        )
      ) {
        // If no media, send as simple text message, caption becomes the text
        commonOptions.text = caption;
        delete commonOptions.caption; // remove caption if no media
      }

      if (content.images && content.images.length > 0) {
        if (content.images.length === 1) {
          const image = content.images[0];
          messageResult = await telegramBot.sendPhoto(
            chatId,
            image.buffer,
            commonOptions as SendPhotoOptions,
            {
              filename: image.filename,
              contentType: image.mimeType,
            }
          );
        } else {
          const mediaGroup: InputMedia[] = content.images.map(
            (image, index) => ({
              type: "photo",
              media: image.buffer,
              caption: index === 0 ? caption : undefined, // Caption only on the first item in media group
              parse_mode: index === 0 ? parseMode : undefined,
            })
          );
          const results = await telegramBot.sendMediaGroup(chatId, mediaGroup);
          messageResult = results[0]; // Use the first message for PostResponse
        }
      } else if (content.videos && content.videos.length > 0) {
        if (content.videos.length === 1) {
          const video = content.videos[0];
          messageResult = await telegramBot.sendVideo(
            chatId,
            video.buffer,
            commonOptions as SendVideoOptions,
            {
              filename: video.filename,
              contentType: video.mimeType,
            }
          );
        } else {
          const mediaGroup: InputMedia[] = content.videos.map(
            (video, index) => ({
              type: "video",
              media: video.buffer,
              caption: index === 0 ? caption : undefined,
              parse_mode: index === 0 ? parseMode : undefined,
            })
          );
          const results = await telegramBot.sendMediaGroup(chatId, mediaGroup);
          messageResult = results[0];
        }
      } else if (content.otherFiles && content.otherFiles.length > 0) {
        if (content.otherFiles.length === 1) {
          const doc = content.otherFiles[0];
          messageResult = await telegramBot.sendDocument(
            chatId,
            doc.buffer,
            commonOptions as SendDocumentOptions,
            {
              filename: doc.filename,
              contentType: doc.mimeType,
            }
          );
        } else {
          const mediaGroup: InputMedia[] = content.otherFiles.map(
            (doc, index) => ({
              type: "document",
              media: doc.buffer,
              caption: index === 0 ? caption : undefined,
              parse_mode: index === 0 ? parseMode : undefined,
            })
          );
          const results = await telegramBot.sendMediaGroup(chatId, mediaGroup);
          messageResult = results[0];
        }
      } else {
        // Just text
        messageResult = await telegramBot.sendMessage(chatId, caption, {
          parse_mode: parseMode,
        });
      }

      return {
        success: true,
        postId: messageResult.message_id.toString(),
        postUrl: messageResult.chat?.username
          ? `https://t.me/${messageResult.chat.username}/${messageResult.message_id}`
          : undefined,
      };
    } catch (e: any) {
      console.error(
        "Telegram post creation failed:",
        e.message ?? e.response?.data?.description ?? e
      );
      return {
        success: false,
        error:
          e.response?.data?.description ||
          e.message ||
          "Failed to create post on Telegram.",
        details: e.response?.data ?? e,
      };
    }
  }

  public async editPost(
    userId: string,
    postId: string,
    content: PostContent
  ): Promise<PostResponse> {
    const chatId = await getTelegramChatIdForUser(userId); // Returns string | null

    if (!chatId) {
      return {
        success: false,
        error: "Telegram Chat ID not configured for this user.",
      };
    }
    // At this point, chatId is a non-empty string from the DB
    const messageId = parseInt(postId, 10);

    const textPart = escapeMarkdownV2(content.text);
    const titlePart = content.title
      ? `*${escapeMarkdownV2(content.title)}*`
      : "";
    const newCaptionOrText = content.title
      ? `${titlePart}\\n\\n${textPart}`
      : textPart;
    const parseMode =
      content.title || textPart !== content.text ? "MarkdownV2" : undefined;

    try {
      let editedResult;
      // Attempt to edit caption first, assuming it might be a media message
      // If it fails (e.g. it was a text-only message), try editing text.
      // A more robust way would be to store the original message type or try/catch specific errors.
      try {
        editedResult = await telegramBot.editMessageCaption(newCaptionOrText, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: parseMode,
        } as EditMessageCaptionOptions);
      } catch (captionError: any) {
        // If editing caption fails (e.g., "Bad Request: message can't be edited"),
        // and the new content is text-only, try editing as text.
        if (
          !(
            content.images?.length ||
            content.videos?.length ||
            content.otherFiles?.length
          )
        ) {
          editedResult = await telegramBot.editMessageText(newCaptionOrText, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: parseMode,
          } as EditMessageTextOptions);
        } else {
          // If it was a media message and caption edit failed for other reasons, or new content still has media
          throw captionError;
        }
      }

      return {
        success: true,
        postId: editedResult.message_id.toString(),
        postUrl: editedResult.chat?.username
          ? `https://t.me/${editedResult.chat.username}/${editedResult.message_id}`
          : undefined,
      };
    } catch (e: any) {
      console.error(
        "Telegram post edit failed:",
        e.message ?? e.response?.data?.description ?? e
      );
      return {
        success: false,
        error:
          e.response?.data?.description ||
          e.message ||
          "Failed to edit post on Telegram.",
        details: e.response?.data ?? e,
      };
    }
  }

  public async deletePost(
    userId: string,
    postId: string
  ): Promise<PostResponse> {
    const chatId = await getTelegramChatIdForUser(userId);
    if (!chatId)
      return {
        success: false,
        error: "Telegram Chat ID not configured for this user or not found.",
      };

    try {
      await telegramBot.deleteMessage(chatId, parseInt(postId, 10));
      return { success: true, postId: postId };
    } catch (e: any) {
      console.error(
        "Telegram post deletion failed:",
        e.message ?? e.response?.data?.description ?? e
      );
      return {
        success: false,
        error:
          e.response?.data?.description ||
          e.message ||
          "Failed to delete post on Telegram.",
        details: e.response?.data ?? e,
      };
    }
  }
}

export const telegramIntegrationService = new TelegramIntegrationService();
