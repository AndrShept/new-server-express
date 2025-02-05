import { Tile, TileType } from '@prisma/client';
import { prisma } from '../utils/prisma';

interface ICreateHeroTile {
  tiles: Tile[];
  dungeonSessionId: string;
  heroId: string;
  tileheight: number;
  tilewidth: number;
}

export const createHeroTile = async ({
  tiles,
  dungeonSessionId,
  heroId,
  tileheight,
  tilewidth,
}: ICreateHeroTile) => {
  const findClearTile = tiles.find(
    (tile) => tile.name === 'ground' && !tile.objectId
  );
  console.log('@@@', findClearTile);
  const heroTile = await prisma.tile.create({
    data: {
      dungeonSessionId,
      heroId,
      name: TileType.hero,
      gid: 0,
      height: tileheight,
      width: tilewidth,
      x: findClearTile?.x ?? 4,
      y: findClearTile?.y ?? 4,
    },
    include: {
      monster: true,
      hero: true,
    },
  });

  tiles.push(heroTile);
  return heroTile;
};
