import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const NotificationController = {
  getNotifications: async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;

    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        include: { post: true, user: true, author: true, comment: true },
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      });

      res.status(200).json(notifications);
    } catch (error) {
      next(error);
    }
  },
  clearAllNotifications: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userId = req.user.userId;
    try {
      await prisma.notification.deleteMany({
        where: { userId },
      });

      res.status(200).json({ message: 'all notifications deleted' });
    } catch (error) {
      next(error);
    }
  },
  updateNotification: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    if (!notificationId) {
      return res
        .status(404)
        .json({ success: false, message: 'notificationId not found' });
    }

    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      res.status(200).json({ message: 'notification updated' });
    } catch (error) {
      next(error);
    }
  },
};
