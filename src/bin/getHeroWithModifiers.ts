import { prisma } from '../utils/prisma';

export const getHeroWithModifiers = async (username: string) => {
  const hero = await prisma.hero.findFirst({
    where: {
      user: { username },
    },
    include: {
      buffs: true,
      modifier: true,
      equipments: true,
      // inventorys: { include: { gameItem: { include: { modifier: true } } } },
    },
  });

  return hero;
};
