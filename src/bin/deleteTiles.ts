import { prisma } from '../utils/prisma';

export const deleteTiles = async (dungeonSessionId: string) => {
  const allTiles = await prisma.tile.findMany({
    where: {
      dungeonSessionId,
    },
  });
  const monsterTiles = await prisma.tile.findMany({
    where: {
      dungeonSessionId,
      monsterId: { not: null },
    },
  });
  const filteredMonsterTiles = monsterTiles.filter((tile) => tile.monsterId);
  const filteredTiles = allTiles.filter((tile) => tile.objectId);

  if (!filteredTiles.length) return;

  await prisma.tile.deleteMany({
    where: {
      objectId: {
        in: filteredTiles.map((tile) => tile.objectId as string),
      },
    },
  });
  await prisma.monster.deleteMany({
    where: {
      id: {
        in: filteredMonsterTiles.map((monster) => monster.monsterId as string),
      },
    },
  });

  await prisma.tile.deleteMany({ where: { dungeonSessionId } });
};
