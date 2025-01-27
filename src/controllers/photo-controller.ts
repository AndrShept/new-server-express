import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { prisma } from '../utils/prisma';
import { NextFunction, Request, Response } from 'express';
import { Photo } from '@prisma/client';
import { PhotoWithRelations } from '../types';
import { s3 } from '../server';

export const PhotoController = {
  addPhotos: async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const files = req.files;
    console.log('files', files);

    try {
      const newPhotos = await prisma.photo.createMany({
        data: files.map((file) => ({
          url: file.location,
          userId,
          name: file.originalname,
          size: file.size,
        })),
      });
      res.status(201).json(newPhotos);
    } catch (error) {
      next(error);
    }
  },
  getPhotosByUsername: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userId = req.user.userId;
    const { username } = req.params;
    const { page } = req.query;
    let { search } = req.query;
    if (search === 'undefined' || search === 'null') {
      search = '';
    }
    const pageNumber = Number(page);
    const pageSize = 10;
    const take = pageNumber * pageSize;
    if (!username) {
      return res.status(404).json({ message: 'username not found' });
    }
    try {
      const photos:PhotoWithRelations[] = await prisma.photo.findMany({
        where: { user: { username }, name: { startsWith: search } },
        take,
        include: {
          comments: true,
          likes: true,
          _count: { select: { view: true, comments: true, likes: true } },
        },
        orderBy: { id: 'desc' },
      });

      const photoWithLike = photos.map((photo) => ({
        ...photo,
        likedByUser: photo.likes.some((like) => like.userId === userId),
      }));

      res.status(201).json(photoWithLike);
    } catch (error) {
      next(error);
    }
  },

  getPhotosById: async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const { photoId } = req.params;

    if (!photoId) {
      return res.status(404).json({ message: 'photoId not found' });
    }
    try {
      const isViewExist = await prisma.view.findFirst({
        where: { userId, photoId },
      });
      if (!isViewExist) {
        await prisma.view.create({
          data: { photoId, userId },
        });
      }
      const photos = await prisma.photo.findUnique({
        where: { id: photoId },

        include: {
          user: true,
          comments: true,
          likes: true,
          _count: { select: { comments: true, likes: true, view: true } },
        },
      });

      const isLikeUsers = photos?.likes.some((like) => like.userId === userId);

      res.status(201).json({ ...photos, likedByUser: isLikeUsers });
    } catch (error) {
      next(error);
    }
  },
  deletePhotos: async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const photos: Photo[] = req.body;
    const photoIdArray = photos.map((photo) => photo.id);
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Delete: {
        Objects: photos.map((photo) => ({ Key: photo.url.split('/').pop() })),
        Quiet: false,
      },
    };
    try {
      const command = new DeleteObjectsCommand(params);
      await s3.send(command);
      const findPhotos = await prisma.photo.findMany({
        where: { id: { in: photoIdArray } },
      });
      for (const photo of findPhotos) {
        if (photo.userId !== userId) {
          return res.status(403).json({ message: 'No access' });
        }
      }
      await prisma.comment.deleteMany({
        where: { parentId: { in: photoIdArray } },
      });
      await prisma.comment.deleteMany({
        where: { photoId: { in: photoIdArray } },
      });
      const result = await prisma.photo.deleteMany({
        where: { id: { in: photoIdArray } },
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};
