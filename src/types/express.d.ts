// types/express.d.ts
import { Hero } from '@prisma/client';
import { HeroWithModifier } from '.';
import { Socket } from 'socket.io';

declare global {
  namespace Express {
    interface Request {
      user: { userId: string };
      hero: HeroWithModifier;
      ioSocket: Socket
    }
  }
}
interface CustomFile extends Express.Multer.File {
  location?: string;
}