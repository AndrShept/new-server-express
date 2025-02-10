import { Hero, Prisma, Tile, TileType } from '@prisma/client';
import { Socket } from 'socket.io';
import { prisma } from '../utils/prisma';
import { getMapJson } from './utils';
import { HeroWithModifier } from '../types';
import { buildingMapData } from './buildingMapData';
import { createHeroTile } from './createHeroTile';
import {  newDeleteTiles } from './deleteAllTiles';
import { buildingMonsterOnMap } from './buildingMonsterOnMap';

export const initDungeon = async (socket: Socket, hero: HeroWithModifier) => {
  socket.on('dungeon-init', async (dungeonSessionId) => {
    // await deleteAllTiles();
    await newDeleteTiles();
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
    const findHero = tiles.find((tile) => tile.heroId === hero.id);
    let newHeroTile:
      | Prisma.TileGetPayload<{
          include: {
            monster: true;
            hero: true;
          };
        }>
      | undefined;
    if (!findHero) {
      newHeroTile = await createHeroTile({
        dungeonSessionId,
        heroId: hero.id,
        tiles,
        tileheight: jsonMap.tileheight,
        tilewidth: jsonMap.tilewidth,
      });
    }
    socket.emit(dungeonSessionId, {
      dungeonMap: tiles,
      height: jsonMap.height,
      width: jsonMap.width,
      tileSize: jsonMap.tilewidth,
      heroPos: {
        x: findHero?.x ?? newHeroTile!.x,
        y: findHero?.y ?? newHeroTile!.y,
      },
    });
  });
};
