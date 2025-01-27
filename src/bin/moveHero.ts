import { Socket } from 'socket.io';
import { prisma } from '../utils/prisma';
import { building2DMap, getMapJson } from './utils';
import { Hero } from '@prisma/client';


export const moveHero = (socket:Socket, hero:Hero) => {
  
  socket.on(`move-hero-${hero.id}`, async (data:any) => {
    const { dungeonSessionId, ...heroPos } = data;
    const isTileBlocked = await prisma.tile.findFirst({
      where: { dungeonSessionId, x: heroPos.x, y: heroPos.y },
    });
    if (isTileBlocked) {
      socket.emit(`move-hero-${hero.id}`, {
        message: 'Tile is busy. You cannot move in this direction.',
        success: false,
      });
      return;
    }
    // console.log('isTileBlocked',isTileBlocked);
    const dungeonSession = await prisma.dungeonSession.findUnique({
      where: { id: dungeonSessionId },
    });
    await prisma.tile.updateMany({
      where: { heroId: hero.id, dungeonSessionId },
      data: { x: heroPos.x, y: heroPos.y },
    });
    const jsonMap = getMapJson(dungeonSession!.dungeonId);

    const newTiles = await prisma.tile.findMany({
      where: { dungeonSessionId },
      include: { hero: true, monster: true },
    });
    const findHero = newTiles.find((tile) => tile.heroId === hero.id);
    const newMap = building2DMap(newTiles, jsonMap);
    const dungeonMap = {
      dungeonMap: newMap,
      height: jsonMap.height,
      width: jsonMap.width,
      tileSize: jsonMap.tilewidth,
      heroPos: { y: findHero?.y, x: findHero?.x },
    };

    socket.emit(dungeonSessionId, dungeonMap);
  });
};
