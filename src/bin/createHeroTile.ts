import { prisma } from '../utils/prisma';
import { rand } from './utils';

export const createHeroTile = async (
  dungeonSessionId: string,
  heroId: string
) => {
  const findClearTile = await prisma.tile.findMany({
    where: {
      dungeonSessionId,
      hero: { is: null },
      object: { is: null },
      x: { lt: 10 },
      y: { lte: 5 },
    },
    take: 10,
  });
  const randomTile = findClearTile[rand(findClearTile.length)];
  const updatedTile = await prisma.tile.update({
    where: { id: randomTile.id },
    data: {
      heroId,
    },
    include: {
      hero: true,
    },
  });
  return updatedTile;
};
