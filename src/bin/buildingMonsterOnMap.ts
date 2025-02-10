import { undeadMonsters } from '../entities/monsters/undead';

import { prisma } from '../utils/prisma';
import { DungeonSession, Monster, RarityType, Tile } from '@prisma/client';
import { HP_MULTIPLIER_COST, MANA_MULTIPLIER_INT } from './constant';
import { getIdBson } from './getIdBson';
import { rand } from './utils';

export const buildingMonsterOnMap = async (dungeonSession: DungeonSession) => {
  const rarity = {
    EASY: RarityType.COMMON,
    NORMAL: RarityType.MAGIC,
    HARD: RarityType.RARE,
  };

  const monsters = Object.values(undeadMonsters);
  const monstersData = Array.from(
    { length: 10 },
    (_, idx) => monsters[rand(monsters.length)]
  ).map((monster) => {
    return {
      ...monster,
      health: HP_MULTIPLIER_COST * monster.modifier.constitution,
      mana: MANA_MULTIPLIER_INT * monster.modifier.intelligence,
      rarity: rarity[dungeonSession.difficulty],
      id: getIdBson(),
      modifierId: getIdBson(),
    };
  });

  await prisma.modifier.createMany({
    data: monstersData.map((monster) => ({
      ...monster.modifier,
      id: monster.modifierId,
    })),
  });
  await prisma.monster.createMany({
    data: monstersData.map(({ modifier, ...monster }) => monster),
  });

  const findClearTiles = await prisma.tile.findMany({
    where: {
      name: 'ground',
      dungeonSessionId: dungeonSession.id,
      object: { is: null },
      hero: { is: null },
    },
  });
  const tileWithMonsters = Array.from(
    { length: monstersData.length },
    (_, idx) => ({
      ...findClearTiles[rand(findClearTiles.length)],
      monsterId: monstersData[idx].id,
    })
  );

  for (let tile of tileWithMonsters) {
    await prisma.tile.update({
      where: { id: tile.id },
      data: { monsterId: tile.monsterId },
    });
  }
};
