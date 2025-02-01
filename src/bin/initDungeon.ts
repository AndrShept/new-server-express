import { Hero, Prisma, Tile, TileType } from '@prisma/client';
import { Socket } from 'socket.io';
import { prisma } from '../utils/prisma';
import { building2DMap, getMapJson, to2DArray } from './utils';
import { HeroWithModifier } from '../types';
import { buildingMapData } from './buildingMapData';
import { createHeroTile } from './createHeroTile';

export const initDungeon = async (socket: Socket, hero: HeroWithModifier) => {
  socket.on('dungeon-init', async (dungeonSessionId) => {
//     await prisma.tile.deleteMany({});
// return
    const dungeonSession = await prisma.dungeonSession.findUnique({
      where: {
        id: dungeonSessionId,
      },
      include: {
        tiles: true,
      },
    });
    const jsonMap = getMapJson('test');
    if (!dungeonSession?.tiles.length) {
      const mapData = buildingMapData(dungeonSessionId, 'test');

      await prisma.tile.createMany({
        data: mapData.map((item) => ({
          ...item,
          id: undefined,
        })),
      });
    }

    const tiles = await prisma.tile.findMany({
      where: {
        dungeonSessionId,
      },
      include: {
        monster: true,
        hero: true,
      },
    });

    const findHero = tiles.find((tile) => tile.heroId === hero.id);
    let newHeroTile: Prisma.TileGetPayload<{
      include: {
        monster: true;
        hero: true;
      };
    }> | undefined
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
      heroPos: { x: findHero?.x ?? newHeroTile!.x, y: findHero?.y ??newHeroTile!.y  },
    });
  });
};
