import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../utils/prisma';

export const ItemController = {
  getAllItems: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gameItems = await prisma.gameItem.findMany({
        // where: { tag: 'ALL' },
        include: { modifier: true },
      });

      res.status(200).json(gameItems);
    } catch (error) {
      next(error);
    }
  },
  getNoviceItems: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const noviceItems = await prisma.gameItem.findMany({
        where: { tag: 'NOVICE' },
        include: { modifier: true },
      });

      res.status(200).json(noviceItems);
    } catch (error) {
      next(error);
    }
  },
  createItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const { modifier, ...data } = body;

      const newItem = await prisma.gameItem.create({
        data: {
          ...data,
          modifier: { create: { ...modifier } },
        },
        include: { modifier: true },
      });

      res.status(201).json(newItem);
    } catch (error) {
      next(error);
    }
  },
  deleteItem: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const { id } = body;

      if (!id) {
        return res.status(404).json('id not found');
      }

      await prisma.inventoryItem.delete({
        where: { id },
      });
      res.status(201).json({ success: true, message: 'Item success deleted' });
    } catch (error) {
      next(error);
    }
  },
};
