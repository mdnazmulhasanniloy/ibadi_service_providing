import { JwtPayload } from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';


declare global {
   var socketio: SocketIOServer | undefined;
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
