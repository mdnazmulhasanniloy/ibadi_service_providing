import config from '@app/config/index.js';
import app from 'app.js';
import { createServer, type Server } from 'http';
import colors from 'colors';
import initializeSocket from '@app/socket/index.js';
import { defaultTask } from '@app/utils/defaultTask.js';
import { connectRedis } from '@app/redis/index.js';
import '@app/workers/message.worker.js';

const socketServer = createServer(app);
let server: Server;

const startRedis = () =>
  connectRedis().then(() => console.log(colors.blue.bold('✨ Redis ready')));

const startSocket = () =>
  initializeSocket(socketServer).then(io => {
    // initRedisSubscriptions(io);
    io.listen(Number(config.socket_port));
    console.log(
      colors.yellow.bold(
        `⚡ Socket.io running on http://${config.ip}:${config.socket_port}`,
      ),
    );
    return io;
  });

const startHttpServer = () =>
  new Promise<Server>((resolve, reject) => {
    const s = app.listen(Number(config.port), config?.ip as string, () => {
      console.log(
        colors.italic.green.bold(
          `💫 Server running on http://${config?.ip}:${config.port}`,
        ),
      );
      defaultTask();
      resolve(s);
    });
    s.on('error', reject);
  });

const shutdown = (reason: string) => (err?: unknown) => {
  console.log(
    colors.red.bold(`😈 ${reason} detected, shutting down...`),
    err ?? '',
  );
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
};

// ── Main ─────────────────────────────────────────────────
startRedis()
  .then(startSocket)
  .then(startHttpServer)
  .then(s => {
    server = s;
  })
  .catch(shutdown('Startup error'));

process.on('unhandledRejection', shutdown('unhandledRejection'));
process.on('uncaughtException', shutdown('uncaughtException'));

// ```

// Flow টা এখন এরকম:
// ```
// startRedis()
//     └──► startSocket()
//               └──► initRedisSubscriptions(io)
//                         └──► startHttpServer()
//                                   └──► server ready ✅
