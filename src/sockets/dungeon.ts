import { Tile } from '@prisma/client';
import { io } from '../server';
import { ISysMessages } from '../types';

export const socketUpdateTile = (dungeonSessionId: string, tile: Tile[]) => {
  io.in(dungeonSessionId).emit(`update-tile-${dungeonSessionId}`, tile);
};
export const socketKickParty = (heroId: string) => {
  io.emit(`party-kick-${heroId}`,heroId )
};
export const socketMoveHero = (
  dungeonSessionId: string,
  data: {
    newTiles: Tile[];
    heroPos: { x: number; y: number };
  }
) => {
  io.to(dungeonSessionId).emit(`move-hero-${dungeonSessionId}`, data);
};

export const socketSendSysMessageToClient = <T>(
  roomId: string,
  messageData: ISysMessages<T>
) => {
  io.to(roomId).emit(`sys-msg-${roomId}`, {
    ...messageData,
    createdAt: messageData.createdAt ?? Date.now(),
  });
};
export const socketSendSysMessageToHero = <T>(
  heroId: string,
  messageData: ISysMessages<T>
) => {
  io.emit(`sys-msg-${heroId}`, {
    ...messageData,
    createdAt: messageData.createdAt ?? Date.now(),
  });
};
