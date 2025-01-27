import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { CustomFile } from '../types/express';
import { s3 } from '../server';
export const MessageController = {
  addMessage: async (req: Request, res: Response) => {
    const body = req.body;
    const file = req?.file as CustomFile;
    const messageData = JSON.parse(body.messageData);
    const { conversationId, authorId, content } = messageData;
    const userId = req.user.userId;

    if (!conversationId) {
      return res.status(404).json({ message: 'conversationId not found' });
    }
    if (!authorId) {
      return res.status(404).json({ message: 'authorId not found' });
    }
    try {
      const newMessage = await prisma.message.create({
        data: {
          content,
          conversationId,
          authorId,
          imageUrl: file?.location,
        },
        include: { author: true, conversation: true },
      });
      res.status(201).json({ ...newMessage, type: 'create' });
    } catch (error) {
      console.error(`create  conversation error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
  editMessage: async (req: Request, res: Response) => {
    const body = req.body;
    const { messageId } = req.params;
    const userId = req.user.userId;
    if (!body) {
      return res.status(404).json({ message: 'body not found ' });
    }
    if (!messageId) {
      return res.status(404).json({ message: 'messageId not found ' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { ...body },
      include: { author: true, conversation: true },
    });
    res.status(200).json({ ...updatedMessage, type: 'update' });

    try {
    } catch (error) {
      console.error(`Update message error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
  isReadOnceMessage: async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const userId = req.user.userId;
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true, updatedAt: message?.createdAt },
      include: { author: true, conversation: true },
    });
    res.status(200).json({ ...updatedMessage, type: 'update' });

    try {
    } catch (error) {
      console.error(`Update message error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },

  deleteMessage: async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const userId = req.user.userId;

    if (!messageId) {
      return res.status(404).json({ message: 'messageId not found ' });
    }
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
      });
      if (message?.imageUrl) {
        const key = message.imageUrl.split('/').pop();
        const deleteParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        };
        const command = new DeleteObjectCommand(deleteParams);
        await s3.send(command);
      }

      const deletedMessage = await prisma.message.delete({
        where: { id: messageId },
        include: { conversation: true },
      });
      res.status(200).json({ ...deletedMessage, type: 'delete' });
    } catch (error) {
      console.error(`Delete message error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
};
