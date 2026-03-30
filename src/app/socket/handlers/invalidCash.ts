import { pubClient } from "@app/redis/index.js";

 

/**
 * Invalidate all message and chat list cache for a given userId
 * @param userId - User ID whose cache should be invalidated
 */
export const invalidateUserCache = async (userId: string) => {
  try {
    // 1️⃣ Invalidate all messages cache
    let cursor = '0';
    do {
      const reply = await pubClient.scan(cursor, {
        MATCH: `messages:${userId}:*`,
      });
      cursor = reply.cursor; // cursor is string
      if (reply.keys.length > 0) {
        await pubClient.del(reply.keys);
      }
    } while (cursor !== '0');

    // 2️⃣ Invalidate all chat list cache
    cursor = '0';
    do {
      const reply = await pubClient.scan(cursor, {
        MATCH: `chat_list:${userId}:*`,
      });
      cursor = reply.cursor;
      if (reply.keys.length > 0) {
        await pubClient.del(reply.keys);
      }
    } while (cursor !== '0');

    console.log(`✅ Cache invalidated for user: ${userId}`);
  } catch (error: any) {
    console.error('Error invalidating cache:', error);
  }
};
