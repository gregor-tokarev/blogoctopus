import { db } from "~/server/lib/db";
import { posts } from "~/server/schema";
import { auth } from "~/server/lib/better-auth";
import { nanoid } from "nanoid";

export default defineEventHandler(async (event) => {
  // Check authentication
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  // Parse request body
  const body = await readBody(event);

  // Validate input
  if (!body.title || !body.content) {
    throw createError({
      statusCode: 400,
      statusMessage: "Title and content are required",
    });
  }

  try {
    // Combine title, content, and images into a single content field
    let fullContent = `# ${body.title}\n\n${body.content}`;
    
    // Add images as markdown if provided
    if (body.images && body.images.length > 0) {
      fullContent += "\n\n";
      body.images.forEach((imageUrl: string) => {
        fullContent += `![Image](${imageUrl})\n\n`;
      });
    }

    // Create post
    const [newPost] = await db
      .insert(posts)
      .values({
        id: nanoid(),
        userId: session.user.id,
        content: fullContent,
        contentTsv: fullContent, // This should ideally be converted to tsvector format
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      success: true,
      post: newPost,
    };
  } catch (error) {
    console.error("Failed to create post:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create post",
    });
  }
});