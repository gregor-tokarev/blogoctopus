import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { posts } from "~/server/schema";
import { and, desc, eq, sql, SQL } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession(toWebRequest(event));

  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const query = getQuery(event);
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  const offset = (page - 1) * limit;
  const searchTerm = query.search?.toString() ?? "";

  let whereConditions: SQL<unknown> | undefined = eq(
    posts.userId,
    session.user.id
  );

  if (searchTerm) {
    const tsQuery = sql`to_tsquery('russian', ${searchTerm.replace(/ /g, ":&")}) || to_tsquery('english', ${searchTerm.replace(/ /g, ":&")})`;
    whereConditions = and(
      whereConditions,
      sql`${posts.contentTsv}::tsvector @@ ${tsQuery}`
    );
  }

  const userPosts = await db
    .select()
    .from(posts)
    .where(whereConditions)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset)
    .execute();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(whereConditions)
    .execute();

  return {
    posts: userPosts,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
    search: searchTerm
      ? {
          term: searchTerm,
          resultsCount: userPosts.length,
        }
      : null,
  };
});
