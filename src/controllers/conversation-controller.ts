import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const ConversationController = {
  getAllConversations: async (req: Request, res: Response) => {
    const userId = req.user.userId;
    try {
      const conversations = await prisma.conversation.findMany({
        where: { OR: [{ receiverId: userId }, { senderId: userId }] },
        // where: { senderId: userId },

        include: { receiverUser: true, senderUser: true, messages: true },
        orderBy: { createdAt: 'desc' },
      });
      // const messages = await prisma.message.findMany({
      //   where: { isRead: false, conversationId: conversations },
      // });
      const conversationsWithNewMessagesCount = conversations.map(
        (conversation) => ({
          ...conversation,
          newMessagesCount: conversation.messages.filter(
            (message) => message.isRead === false && message.authorId !== userId
          ).length,
        })
      );
      res.status(200).json(conversationsWithNewMessagesCount);
    } catch (error) {
      console.error(`Get all conversation error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
  getConversationById: async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(404).json({ message: 'conversationId not fount' });
    }
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },

        include: {
          receiverUser: true,
          senderUser: true,
          messages: { include: { author: true } },
        },
      });

      res.status(200).json(conversation);
    } catch (error) {
      console.error(`Get conversation by ID error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
  addConversation: async (req: Request, res: Response) => {
    const { receiverId } = req.body;
    console.log('receiverId', receiverId);
    const userId = req.user.userId;
    if (!receiverId) {
      return res.status(404).json({ message: 'receiver Id not found' });
    }
    try {
      const existConversation = await prisma.conversation.findFirst({
        where: {
          OR: [
            { receiverId: receiverId, senderId: userId },
            { receiverId: userId, senderId: receiverId },
          ],
          //  [{ receiverId: userId }, { senderId: receiverId }],
        },
      });
      if (existConversation) {
        return res.status(200).json(existConversation);
      }
      const conversation = await prisma.conversation.create({
        data: { receiverId: receiverId, senderId: userId },
      });
      res.status(200).json(conversation);
    } catch (error) {
      console.error(`create  conversation error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
  deleteConversation: async (req: Request, res: Response) => {
    const userId = req.user.userId;

    try {
      await prisma.conversation.deleteMany({});

      res.status(200).json({ message: 'delete ALL' });
    } catch (error) {
      console.error(`Get all conversation error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
  isReadMessages: async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    if (!conversationId) {
      return res.status(404).json({ message: 'conversationId not found ' });
    }
    console.log('PAGNALISDADASDASADS', conversationId);

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      include: { messages: true },
      data: {
        messages: {
          // update: { where: { isRead: { not: true } }, data: { isRead: true } },
          updateMany: [
            {
              where: {
                AND: [{ conversationId }, { isRead: false }],
              },
              data: { isRead: true },
            },
          ],
        },
      },
    });

    res.status(200).json(updatedConversation);

    try {
    } catch (error) {
      console.error(`Update message error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
};
