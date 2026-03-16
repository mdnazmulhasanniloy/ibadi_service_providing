import getUserDetailsFromToken from '@app/helpers/getUserDetailsFromToken.js';
import { Socket } from 'socket.io'; 

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.token;

    const user = await getUserDetailsFromToken(token);
    if (!user) return next(new Error('Authentication failed'));

    // Attach user to socket (use type assertion if needed)
    (socket as any).data = {
      userId: user.id,
      role: user?.role,
      email: user?.email,
      name: user?.name,
      profile: user?.profile || null,
    };

    next();
  } catch (err) {
    next(err as Error);
  }
};
