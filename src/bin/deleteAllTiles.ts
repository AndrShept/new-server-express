import { prisma } from '../utils/prisma';

export const newDeleteTiles = async () => {
  const allTiles = await prisma.tile.findMany({});
  const filteredTiles = allTiles.filter((tile) => tile.objectId);

  if (!filteredTiles.length) return;

  await prisma.tile.deleteMany({
    where: {
      objectId: {
        in: filteredTiles.map((tile) => tile.objectId as string),
      },
    },
  });
  await prisma.tile.deleteMany();
};
