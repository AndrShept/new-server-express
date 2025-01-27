// types/express.d.ts
import { Hero } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user: { userId: string };
      hero: Hero;
    }
  }
}
interface CustomFile extends Express.Multer.File {
  location?: string;
}