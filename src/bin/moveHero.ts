import { Socket } from 'socket.io';
import { prisma } from '../utils/prisma';
import { Hero } from '@prisma/client';
import { io } from '../server';

export const moveHero = (socket: Socket, hero: Hero) => {
  socket.on(`move-hero-${hero.id}`, async (data: any) => {
    const { dungeonSessionId, ...heroPos } = data;
    const findTile = await prisma.tile.findFirst({
      where: {
        dungeonSessionId,
        x: heroPos.x,
        y: heroPos.y,
        name: { not: 'decor' },
      },
    });
    const isTileBlocked =
      findTile?.objectId || findTile?.heroId || findTile?.monsterId;
    if (isTileBlocked) {
      socket.emit(`move-hero-${hero.id}`, {
        message: 'Tile is busy. You cannot move in this direction.',
        success: false,
      });
      return;
    }
    const isValidMove = (
      oldX: number,
      oldY: number,
      newX: number,
      newY: number
    ): boolean => {
      return Math.abs(oldX - newX) >= 2 || Math.abs(oldY - newY) >= 2;
    };

    const currentTile = await prisma.tile.findFirst({
      where: {
        heroId: hero.id,
        dungeonSessionId,
      },
    });

    if (!currentTile) return;
    if (
      isValidMove(
        currentTile.x,
        currentTile.y,
        findTile?.x ?? 0,
        findTile?.y ?? 0
      )
    ) {
      socket.emit(`move-hero-${hero.id}`, {
        message: ' You cannot move in this direction.',
        success: false,
      });
      return;
    }
    const newHeroPos = { ...heroPos };

    const updatedTiles = await prisma.$transaction([
      prisma.tile.update({
        where: { dungeonSessionId, id: currentTile.id },
        data: { heroId: null },
        include: {
          hero: true,
          object: true,
        },
      }),
      prisma.tile.update({
        where: { dungeonSessionId, id: findTile?.id },
        data: { heroId: hero.id, x: newHeroPos.x, y: newHeroPos.y },
        include: {
          hero: true,
          object: true,
        },
      }),
    ]);

    io.in(dungeonSessionId).emit(`move-hero-${dungeonSessionId}`, {
      newTiles: updatedTiles,
      heroPos: { x: newHeroPos.x, y: newHeroPos.y },
    });

  });
};
