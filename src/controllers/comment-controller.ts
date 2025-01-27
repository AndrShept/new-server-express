import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const CommentController = {
  getComments: async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({ message: 'ID not found' });
    }

    try {
      const isPost = await prisma.post.findUnique({
        where: { id },
      });
      const comments = await prisma.comment.findMany({
        where: isPost ? { postId: id } : { photoId: id },
        include: {
          likes: true,
          author: true,
          post: true,
          replys: true,
        },
      });
      for (const comment of comments) {
        comment.replys = await getReplies(comment.id);
      }
      res.status(200).json(comments);
    } catch (error) {
      console.error(`Get all comments error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },

  addComment: async (req: Request, res: Response) => {
    const body = req.body;
    const userId = req.user.userId;

    if (!body) {
      return res.status(404).json({ message: 'Body not found' });
    }
    try {
      const newComment = await prisma.comment.create({
        data: { ...body, authorId: userId },
      });
      res.status(201).json(newComment);
    } catch (error) {
      console.error(`Create comment error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
  editComment: async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const { content } = req.body;

    if (!content) {
      return res.status(404).json({ message: 'Content required field' });
    }

    try {
      const comment = await prisma.comment.findUnique({ where: { id } });

      if (!comment) {
        return res.status(404).json({ message: 'Comment   not found' });
      }
      if (comment.authorId !== userId) {
        return res.status(403).json({ message: 'No access' });
      }
      if (comment) {
        const updatedComment = await prisma.comment.update({
          data: { content },
          where: { id },
        });
        res.status(200).json(updatedComment);
      }
    } catch (error) {
      console.error(`Update comment error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
  deleteComment: async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
      const comment = await prisma.comment.findUnique({ where: { id } });
      if (!comment) {
        return res.status(404).json({ message: 'Comment  not found' });
      }
      if (comment.authorId !== userId) {
        return res.status(403).json({ message: 'No access' });
      }
      await deleteReplies(id);

      await prisma.comment.delete({
        where: { id },
      });
      res.status(200).json({ message: 'comment success deleted' });
    } catch (error) {
      console.error(`Delete comment error ${error} `);
      return res
        .status(500)
        .json({ error: `Internal database error ${error}` });
    }
  },
};

async function deleteReplies(commentId: string) {
  const replies = await prisma.comment.findMany({
    where: { replyId: commentId },
    include: { replys: true },
  });

  for (const reply of replies) {
    await deleteReplies(reply.id);

    await prisma.comment.delete({
      where: { id: reply.id },
    });
  }
}

async function getReplies(commentId: string) {
  const replies = await prisma.comment.findMany({
    where: { replyId: commentId },
    include: {
      likes: true,
      author: true,
      post: true,
      replys: true,
    },
  });

  for (const reply of replies) {
    reply.replys = await getReplies(reply.id);
  }

  return replies;
}
