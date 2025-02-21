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
  socketRefetchData,
  socketSendSysMessageToClient,
  socketSendSysMessageToHero,
  socketUpdateTile,
} from '../../sockets/main-socket';
import { GroupInviteResponse, SysMessageType } from '../../types';
import { io } from '../../server';
import { Socket } from 'socket.io';

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
      const socket = req.ioSocket

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
      // socket?.emit(
      //   `invite-party-${invitedHero.id}`,
      //   self,
      //   async (data: GroupInviteResponse) => {
          const data = 'accepted'
          if (data === 'accepted') {
            const newPartyMembers = await prisma.dungeonParty.create({
              data: {
                dungeonSessionId,
                memberId: heroId,
              },
              include: {
                member: true,
              },
            });
            // socket.join(dungeonSessionId);
            socketRefetchData(invitedHero.id);
            return res.status(201).json({
              success: true,
              message: `${invitedHero.name} has joined the group!`,
              data: newPartyMembers,
            });
          }
          if (data === 'declined') {
            return res.json({
              success: false,
              message: `${invitedHero.name} has declined the group invitation.`,
              data: invitedHero,
            });
          }
          if (data === 'timeout') {
            return res.json({
              success: false,
              message: `${invitedHero?.name} did not respond to the group invitation.`,
              data: invitedHero,
            });
          }
      //   }
      // );
    } catch (error) {
      next(error);
    }
  },
  deleteDungeonPartyHero: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const socket = req.app.locals.socket;
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
      socket.leave(dungeonSessionId);
      socketRefetchData(memberId);
      socketSendSysMessageToClient(dungeonSessionId, {
        type: SysMessageType.INFO,
        message: `${findMember.member?.name} kicked the party`,
      });
      socketSendSysMessageToHero(memberId, {
        type: SysMessageType.INFO,
        message: `You kicked from party`,
      });
      socketKickParty(memberId);

      res.status(201).json({
        success: true,
        message: `${findMember.member?.name} kicked the party`,
        data: findMember,
      });
    } catch (error) {
      next(error);
    }
  },
};
