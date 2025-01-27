import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { HeroWithModifier } from '../types';

export const getHero = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user.userId;

    const hero = await prisma.hero.findFirst({
      where: { userId },
      include: {
        modifier: true,
      },
    });
    if (!hero) {
      return res.status(404).json('Hero not found');
    }
    if (!hero.id) {
      return res.status(404).json('Hero ID not found');
    }

    req.hero = hero;
    next();
  } catch (error) {
    next(error);
  }
};
