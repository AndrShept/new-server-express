import { prisma } from '../utils/prisma';

export const deleteAllTiles = async () => {
  const allTiles = (await prisma.tile.findMany({}))
    .filter((item) => item.objectId)
    .map((item) => item.objectId);
  for (const tile of allTiles) {
    await prisma.tile.deleteMany({
      where: {
        objectId: tile,
      },
    });
  }
  await prisma.tile.deleteMany();
};
