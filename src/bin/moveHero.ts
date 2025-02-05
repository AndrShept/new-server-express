import { Socket } from 'socket.io';
import { prisma } from '../utils/prisma';
import { Hero } from '@prisma/client';

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
    // console.log('isTileBlocked',isTileBlocked);

    const currentTile = await prisma.tile.findFirst({
      where: {
        heroId: hero.id,
        dungeonSessionId,
      },
    });

    if (!currentTile) return;
    const newHeroPos = { ...heroPos };
    console.log(newHeroPos);

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

    socket.emit(`move-hero-${dungeonSessionId}`, {
      newTiles: updatedTiles,
      heroPos: { x: newHeroPos.x, y: newHeroPos.y },
    });
  });
};
