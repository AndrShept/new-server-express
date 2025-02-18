import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../utils/prisma';
import {
  createDungeonPartyHeroDTO,
  deleteDungeonPartyHeroDTO,
  getDungeonPartyDTO,
  getDungeonPartyHeroByTermDTO,
} from '../../dto/dungeon-party';
import {
  socketKickParty,
  socketSendSysMessageToClient,
  socketSendSysMessageToHero,
  socketUpdateTile,
} from '../../sockets/dungeon';
import { SysMessageType } from '../../types';
import { io } from '../../server';
import { inviteHeroToParty } from '../../bin/inviteToParty';

export const DungeonPartyController = {
  getDungeonParty: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dungeonSessionId } = getDungeonPartyDTO.parse(req.params);
      const heroId = req.hero.id;
      const dungeonParty = await prisma.dungeonParty.findMany({
        where: {
          dungeonSessionId,
        },
        include: {
          member: true,
        },
      });

      res.status(200).json(dungeonParty);
    } catch (error) {
      next(error);
    }
  },
  getDungeonPartyHeroByTerm: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const heroId = req.hero.id;
      const { searchTerm } = getDungeonPartyHeroByTermDTO.parse(req.params);
      const dungeonSession = await prisma.dungeonSession.findFirst({
        where: {
          ownerId: heroId,
          status: 'INPROGRESS',
        },

        include: {
          dungeonParty: {
            include: {
              member: true,
            },
          },
        },
      });

      const heroes = await prisma.hero.findMany({
        where: {
          name: {
            startsWith: searchTerm,
            mode: 'insensitive',
          },
          id: {
            notIn: dungeonSession?.dungeonParty.map(
              (party) => party.memberId ?? ''
            ),
          },
        },

        include: {
          dungeonSessions: {
            where: {
              status: 'INPROGRESS',
            },
          },
          dungeonParty: true,
        },
      });

      res.status(200).json(heroes);
    } catch (error) {
      next(error);
    }
  },
  createDungeonPartyHero: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { dungeonSessionId, heroId } = createDungeonPartyHeroDTO.parse(
        req.body
      );
      const selfId = req.hero.id;
      const self = req.hero;
      const socket = req.app.locals.socket;
      const dungeonSession = await prisma.dungeonSession.findUnique({
        where: { id: dungeonSessionId },
      });
      if (!dungeonSession) {
        return res
          .status(404)
          .json({ success: false, message: 'dungeonSession not found' });
      }
      if (heroId === selfId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot add yourself to the dungeon party.',
        });
      }

      const partyMembers = await prisma.dungeonParty.findMany({
        where: {
          dungeonSessionId,
        },
      });
      if (partyMembers.length >= 3) {
        return res.json({
          success: false,
          message: 'The group has reached the maximum limit of 3 members.',
        });
      }
      const sessionInProgress = await prisma.dungeonSession.findFirst({
        where: {
          ownerId: heroId,
          status: 'INPROGRESS',
        },
      });
      const memberOnOtherParty = await prisma.dungeonParty.findFirst({
        where: {
          memberId: heroId,
          dungeonSession: {
            status: 'INPROGRESS',
          },
        },
      });
      if (sessionInProgress || memberOnOtherParty) {
        return res.json({
          success: false,
          message:
            'Hero already have an active dungeon session and cannot join another party.',
        });
      }

      const invitedHero = await prisma.hero.findUnique({
        where: { id: heroId },
      });
      if (!invitedHero) return;
      socket
        .timeout(5000)
        .emit(`invite-party-${invitedHero.id}`, self, async (err, data) => {
          console.log(data);
          console.log(err);
          if (err) {
           return res.json({
              success: false,
              message: `тупіт жоско ${invitedHero?.name} to party`,
              data: invitedHero,
            });
          }
          if (data?.accepted) {
            const newPartyMembers = await prisma.dungeonParty.create({
              data: {
                dungeonSessionId,
                memberId: heroId,
              },
              include: {
                member: true,
              },
            });

            socketSendSysMessageToHero(invitedHero?.id, 'refresh');
          return  res.status(201).json({
              success: true,
              message: `You add ${newPartyMembers.member?.name} to party`,
              data: newPartyMembers,
            });
          }
          if (!data?.accepted) {
          return  res.json({
              success: false,
              message: `no hero ${invitedHero?.name} to party`,
              data: invitedHero,
            });
          }

        });


    } catch (error) {
      next(error);
    }
  },
  deleteDungeonPartyHero: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { memberId, dungeonSessionId } = deleteDungeonPartyHeroDTO.parse(
        req.params
      );
      const selfId = req.hero.id;

      const findMember = await prisma.dungeonParty.findFirst({
        where: {
          memberId,
        },
        include: {
          member: true,
        },
      });
      const dungeonSession = await prisma.dungeonSession.findUnique({
        where: { id: dungeonSessionId },
      });
      if (!findMember) {
        return res
          .status(404)
          .json({ success: false, message: 'party member not found' });
      }

      if (dungeonSession?.ownerId !== selfId) {
        return res.status(400).json({
          success: false,
          message: 'The party leader cannot be removed from the group.',
        });
      }
      if (memberId === selfId) {
        return res.status(400).json({
          success: false,
          message: 'You cant kick yourself from the group.',
        });
      }
      await prisma.dungeonParty.deleteMany({
        where: {
          memberId,
        },
      });
      const memberTile = await prisma.tile.findFirst({
        where: {
          heroId: memberId,
          dungeonSessionId,
        },
      });
      if (memberTile) {
        await prisma.tile.update({
          where: {
            id: memberTile.id,
          },
          data: { heroId: null },
        });
        socketUpdateTile(dungeonSessionId, [{ ...memberTile, heroId: null }]);
      }
      socketSendSysMessageToClient(dungeonSessionId, {
        type: SysMessageType.INFO,
        message: `member ${findMember.member?.name} removed party`,
      });
      socketSendSysMessageToHero(memberId, {
        type: SysMessageType.INFO,
        message: `You kicked from party  party`,
      });
      socketKickParty(memberId);

      res.status(201).json({
        success: true,
        message: `member ${findMember.member?.name} removed party`,
        data: findMember,
      });
    } catch (error) {
      next(error);
    }
  },
};
