import { createClient, type RedisClientType } from 'redis';
import colors from 'colors';
import { Queue } from 'bullmq';
import config from '@app/config/index.js';
import { Server } from 'socket.io';

const redisHost = config.redis_host || 'project_format_redis';
const redisPort = parseInt(config.redis_port || '6379');
const redisUrl = `redis://${redisHost}:${redisPort}`;

const connection = {
  host: redisHost,
  port: redisPort,
};

const pubClient: RedisClientType = createClient({ url: redisUrl });
const subClient: RedisClientType = pubClient.duplicate();

pubClient.on('error', err =>
  console.error(colors.red('Redis pubClient error:'), err),
);
subClient.on('error', err =>
  console.error(colors.red('Redis subClient error:'), err),
);

const connectRedis = async () => {
  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log(colors.blue.bold('✨ Connected to Redis server'));
  } catch (error) {
    console.error(colors.red.bold('❌ Redis connection failed:'), error);
    process.exit(1);
  }
};

// ── Queues ───────────────────────────────────────────────
const messageQueue = new Queue('save_messages', { connection });
const eventQueue = new Queue('event_notification', { connection });
const notificationQueue = new Queue('general_notification', { connection });

// ── Subscribe (io inject করা হবে server.ts থেকে) ─────────
const initRedisSubscriptions = (io: Server) => {
  subClient.subscribe('new_message_channel', async rawMessage => {
    try {
      const message = JSON.parse(rawMessage);

       
      await messageQueue.add('save', message);

      // Receiver কে emit
      const receiverSocketId = await pubClient.hGet(
        'userId_to_socketId',
        message.receiverId,
      );

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', message);
      }
    } catch (error) {
      console.error(colors.red('new_message_channel error:'), error);
    }
  });
};

export {
  pubClient,
  subClient,
  connectRedis,
  initRedisSubscriptions,
  messageQueue,
  eventQueue,
  notificationQueue,
  connection,
};
