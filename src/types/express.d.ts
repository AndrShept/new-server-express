// types/express.d.ts
import { Hero } from '@prisma/client';
import { HeroWithModifier } from '.';

declare global {
  namespace Express {
    interface Request {
      user: { userId: string };
      hero: HeroWithModifier;
    }
  }
}
interface CustomFile extends Express.Multer.File {
  location?: string;
}