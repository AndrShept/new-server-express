import { NextFunction, Request, Response } from 'express';
import { getMapJson } from '../../bin/utils';
import { prisma } from '../../utils/prisma';
import { Prisma, SessionStatus, Tile } from '@prisma/client';
import {
  getDungeonMapDTO,
  updateDungeonSessionStatusDTO,
} from '../../dto/dungeon';
import { deleteTiles } from '../../bin/deleteTiles';
import { buildingMapData } from '../../bin/buildingMapData';
import { buildingMonsterOnMap } from '../../bin/buildingMonsterOnMap';
import { createHeroTile } from '../../bin/createHeroTile';
import {
  socketSendSysMessageToClient,
  socketUpdateTile,
} from '../../sockets/dungeon';
import { SysMessageType } from '../../types';

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
    try {
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
    try {
      const { dungeonSessionId } = req.params;
      const heroId = req.hero.id;

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
    try {
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
    try {
      const heroId = req.hero.id;
      const heroName = req.hero.name;
      const { dungeonSessionId, status } = updateDungeonSessionStatusDTO.parse(
        req.body
      );

      if (!status) {
        return res.status(404).json('status not found');
      }
      if (!dungeonSessionId) {
        return res.status(404).json('dungeonSessionId not found');
      }

      const dungeonSession = await prisma.dungeonSession.findUniqueOrThrow({
        where: {
          id: dungeonSessionId,
        },
      });

      if (dungeonSession.ownerId !== heroId) {
        const findTile = await prisma.tile.findMany({
          where: {
            dungeonSessionId,
            heroId,
          },
        });
        if (!!findTile.length) {
          await prisma.tile.update({
            where: {
              id: findTile[0].id,
            },
            data: {
              heroId: null,
            },
          });
          socketUpdateTile(
            dungeonSessionId,
            findTile.map((tile) => ({
              ...tile,
              heroId: null,
            }))
          );
        }

        await prisma.dungeonParty.deleteMany({
          where: {
            dungeonSessionId,
            memberId: heroId,
          },
        });

        socketSendSysMessageToClient(dungeonSessionId, {
          message: `${heroName} leave the dungeon session`,
          type: SysMessageType.INFO,
        });

        return res
          .status(200)
          .json({ success: true, message: 'leave the dungeon session' });
      }

      await deleteTiles(dungeonSessionId);

      const updatedDungeonSession = await prisma.dungeonSession.update({
        where: { id: dungeonSessionId },
        data: {
          status: status as SessionStatus,
          endTime: new Date().toISOString(),
        },
      });

      await prisma.dungeonParty.deleteMany({
        where: {
          dungeonSessionId,
        },
      });
      res.status(200).json(updatedDungeonSession);
    } catch (error) {
      next(error);
    }
  },
  getDungeonMap: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const heroId = req.hero.id;
      const { dungeonSessionId } = getDungeonMapDTO.parse(req.params);
      if (!dungeonSessionId) {
        return res.status(404).json('status not found');
      }
      const partyMember = await prisma.dungeonParty.findFirst({
        where: {
          memberId: heroId,
          dungeonSessionId,
        },
      });
      if (!partyMember) {
        return res.status(404).json('access denied you not a party members');
      }

      const dungeonSession = await prisma.dungeonSession.findUnique({
        where: {
          id: dungeonSessionId,
        },
        include: {
          tiles: true,
        },
      });
      if (!dungeonSession) return;
      const jsonMap = getMapJson('test');
      if (!dungeonSession?.tiles.length) {
        await buildingMapData(dungeonSessionId, 'test');
        await buildingMonsterOnMap(dungeonSession);
        await createHeroTile(dungeonSessionId, heroId);
      }
      const findHero = await prisma.tile.findFirst({
        where: {
          heroId,
          dungeonSessionId,
        },
      });

      let newHeroTile: Tile;
      if (!findHero) {
        newHeroTile = await createHeroTile(dungeonSessionId, heroId);
        socketUpdateTile(dungeonSessionId, [newHeroTile]);
      }
      const tiles = await prisma.tile.findMany({
        where: {
          dungeonSessionId,
          name: { in: ['ground', 'decor', 'object'] },
        },
        include: {
          monster: true,
          hero: true,
          object: true,
        },
      });
      const mapData = {
        dungeonMap: tiles,
        height: jsonMap.height,
        width: jsonMap.width,
        tileSize: jsonMap.tilewidth,
        heroPos: findHero
          ? { x: findHero.x, y: findHero.y }
          : { x: newHeroTile!.x, y: newHeroTile!.y },
      };

      res.status(200).json(mapData);
    } catch (error) {
      next(error);
    }
  },
};
