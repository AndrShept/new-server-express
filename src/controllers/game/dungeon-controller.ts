import { NextFunction, Request, Response } from 'express';
import { getMapJson } from '../../bin/utils';
import { prisma } from '../../utils/prisma';
import { SessionStatus } from '@prisma/client';
import { updateDungeonSessionStatusDTO } from '../../dto/dungeon';
import { deleteTiles } from '../../bin/deleteTiles';

export const DungeonController = {
  getDungeons: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dungeons = await prisma.dungeon.findMany();

      res.status(200).json(dungeons);
    } catch (error) {
      next(error);
    }
  },
  getAllDungeonsSessionInStatus: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const heroId = req.hero.id;
    const { status } = req.params as { status: SessionStatus };

    if (!status) {
      return res
        .status(404)
        .json({ success: false, message: 'session status not found' });
    }
    if (!Object.values(SessionStatus).includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid session status' });
    }
    try {
      const dungeonSessions = await prisma.dungeonSession.findMany({
        where: {
          status,
          dungeonParty: {
            some: {
              member: {
                id: heroId,
              },
            },
          },
        },
        include: {
          dungeon: true,
          dungeonParty: {
            include: {
              member: true,
            },
          },
        },
      });

      res.status(200).json(dungeonSessions);
    } catch (error) {
      next(error);
    }
  },
  getDungeonsSessionById: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { dungeonSessionId } = req.params;
    const heroId = req.hero.id;
    try {
      const dungeonSession = await prisma.dungeonSession.findUnique({
        where: { id: dungeonSessionId },
        include: { dungeon: true, dungeonParty: true },
      });

      res.status(200).json(dungeonSession);
    } catch (error) {
      next(error);
    }
  },

  createDungSession: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const heroId = req.hero.id;
    const { dungeonId } = req.body;

    if (!dungeonId) {
      return res.status(404).json('dungeonId not found');
    }
    const dungeon = await prisma.dungeon.findUnique({
      where: { id: dungeonId },
    });
    if (!dungeon) {
      return res.status(404).json('dungeon not found');
    }
    const map = getMapJson(dungeon.id);
    const dungSessionInProgress = await prisma.dungeonSession.findFirst({
      where: {
        ownerId: heroId,
        status: 'INPROGRESS',
      },
    });
    if (dungSessionInProgress) {
      return res
        .status(409)
        .json(
          'A dungeon session is already in progress. You must finish or exit the current session before starting a new one'
        );
    }

    try {
      const dungeonSession = await prisma.dungeonSession.create({
        data: {
          difficulty: 'EASY',
          duration: dungeon.duration,
          status: 'INPROGRESS',
          dungeonId,
          ownerId: heroId,
          mapHeight: map.height,
          mapWidth: map.width,
          tileSize: map.tileheight,
          dungeonParty: {
            create: {
              memberId: heroId,
            },
          },
        },
      });

      res.status(201).json(dungeonSession);
    } catch (error) {
      next(error);
    }
  },
  updateDungeonSessionStatus: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { dungeonSessionId, status } = updateDungeonSessionStatusDTO.parse(
      req.body
    );

    if (!status) {
      return res.status(404).json('status not found');
    }
    if (!dungeonSessionId) {
      return res.status(404).json('dungeonSessionId not found');
    }
    try {
      await deleteTiles(dungeonSessionId);
      const dungeonSession = await prisma.dungeonSession.update({
        where: { id: dungeonSessionId },
        data: {
          status: status as SessionStatus,
          endTime: new Date().toISOString(),
        },
      });

      res.status(200).json(dungeonSession);
    } catch (error) {
      next(error);
    }
  },
};
