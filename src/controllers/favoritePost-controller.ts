import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const FavoritePostController = {
  addFavorite: async (req: Request, res: Response, next: NextFunction) => {
    const { postId } = req.params;
    const userId = req.user.userId;
    if (!postId) {
      return res.status(404).json({ message: 'postId not found' });
    }

    try {
      const existFavoritePost = await prisma.favoritePost.findFirst({
        where: { postId, userId },
      });

      if (existFavoritePost) {
        await prisma.favoritePost.delete({
          where: { id: existFavoritePost.id },
        });
        return res.status(200).json({ message: 'favorite post deleted' });
      }

      const favoritePost = await prisma.favoritePost.create({
        data: { postId, userId },
      });
      res.status(201).json(favoritePost);
    } catch (error) {
      next(error);
    }
  },
};
