export interface FileAttachment {
  buffer: Buffer; // Raw file data
  filename: string;
  mimeType: string;
  url?: string; // Optional: if the file is already hosted and you're just linking
}

export interface PostContent {
  text: string;
  images?: FileAttachment[];
  videos?: FileAttachment[];
  // LinkedIn specific might have documents, Telegram might have other types
  otherFiles?: FileAttachment[];
}

export interface PostResponse {
  success: boolean;
  postId?: string; // ID of the post on the platform
  postUrl?: string; // URL to the post on the platform
  error?: string;
  details?: any; // For any additional platform-specific response data
}

export interface IntegrationService {
  name: string;

  /**
   * Creates a new post on the integrated platform.
   * @param userId The ID of the user in your system, used to fetch credentials.
   * @param content The content of the post.
   * @returns A promise resolving to the post response.
   */
  createPost(userId: string, content: PostContent): Promise<PostResponse>;

  /**
   * Edits an existing post on the integrated platform.
   * @param userId The ID of the user in your system.
   * @param postId The ID of the post on the platform to edit.
   * @param content The new content for the post.
   * @returns A promise resolving to the post response.
   */
  editPost(
    userId: string,
    postId: string,
    content: PostContent,
  ): Promise<PostResponse>;

  /**
   * Deletes a post from the integrated platform.
   * @param userId The ID of the user in your system.
   * @param postId The ID of the post on the platform to delete.
   * @returns A promise resolving to the post response.
   */
  deletePost(userId: string, postId: string): Promise<PostResponse>;
}

// Export all integration services
export { linkedinIntegrationService } from "./linkedin";
export { telegramIntegrationService } from "./telegram";
