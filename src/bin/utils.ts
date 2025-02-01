import { DungeonSession, Modifier, Tile } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { HP_MULTIPLIER_COST, MANA_MULTIPLIER_INT } from './constant';
import { TileMap, TileObject } from '../types';

export const userOnline = async (userId: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isOnline: true },
  });
};

export const userOffline = async (userId: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false },
  });
};

export function sumModifiers(...modifiers: Modifier[]) {
  const result: { [key: string]: number } = {};

  modifiers.forEach((modifier) => {
    for (const key in modifier) {
      const value = modifier[key];
      if (typeof value === 'number') {
        result[key] = (result[key] || 0) + value;
      } else if (result[key] === undefined) {
        result[key] = value;
      }
    }
  });

  return result;
}
export function subtractModifiers(
  firstModifier: Modifier,
  ...modifiers: any[]
) {
  const result = { ...firstModifier };

  modifiers.forEach((modifier) => {
    for (const key in modifier) {
      const value = modifier[key];
      if (typeof value === 'number') {
        result[key] = (result[key] || 0) - value;
      }
    }
  });

  return result;
}

export const getHeroId = async (userId: string) => {
  const hero = await prisma.hero.findFirst({
    where: {
      userId,
    },
  });
  return hero?.id;
};
export const getHero = async (userId: string) => {
  const hero = await prisma.hero.findFirst({
    where: {
      userId,
    },
    include: { modifier: true },
  });
  return hero;
};

export const onHtml = (url: string) => {
  return `
  <html dir="ltr" lang="en">
  
  <head>
  
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="x-apple-disable-message-reformatting" />
  </head>
  
  <body style="background-color:#f6f9fc;padding:10px 0">
  <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:37.5em;background-color:#ffffff;border:1px solid #f0f0f0;padding:45px">
  <tbody>
  <tr style="width:100%">
    <td>
      <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
        <tbody>
          <tr>
            <td>
          
              <p style="font-size:16px;line-height:26px;margin:16px 0;font-family:'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif;font-weight:300;color:#404040">Someone recently requested a password change for your account. If this was you, you can set a new password here:</p>
              <a href=${url} style="line-height:100%;text-decoration:none;display:block;max-width:100%;mso-padding-alt:0px;background-color:#007ee6;border-radius:4px;color:#fff;font-family:'Open Sans', 'Helvetica Neue', Arial;font-size:15px;text-align:center;width:210px;padding:14px 7px 14px 7px" target="_blank">
                <span><!--[if mso]><i style="mso-font-width:350%;mso-text-raise:21" hidden>&#8202;</i><![endif]--></span>
                <span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:10.5px">Reset password</span>
                <span><!--[if mso]><i style="mso-font-width:350%" hidden>&#8202;&#8203;</i><![endif]--></span>
              </a>
              <p style="font-size:16px;line-height:26px;margin:16px 0;font-family:'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif;font-weight:300;color:#404040">If you don&#x27;t want to change your password or didn&#x27;t request this, just ignore and delete this message.</p>
              <p style="font-size:16px;line-height:26px;margin:16px 0;font-family:'Open Sans', 'HelveticaNeue-Light', 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif;font-weight:300;color:#404040">To keep your account secure, please don&#x27;t forward this email to anyone.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
  </tbody>
  </table>
  </body>
  
  </html>
  `;
};

export function addModifiers(firstModifier: Modifier, ...modifiers: any[]) {
  const result = { ...firstModifier };

  modifiers.forEach((modifier) => {
    Object.keys(modifier).forEach((key) => {
      const value = modifier[key];
      if (typeof value === 'number') {
        result[key] = (result[key] || 0) + value;
      }
    });
  });

  return result;
}
export const calculateHpAndMana = (modifier: Modifier) => {
  if (!modifier.constitution || !modifier.intelligence) return;
  return {
    ...modifier,
    maxHealth:
      modifier.constitution * HP_MULTIPLIER_COST +
      (modifier.maxHealth ? modifier.maxHealth : 0),
    maxMana:
      modifier.intelligence * MANA_MULTIPLIER_INT +
      (modifier.maxMana ? modifier.maxMana : 0),
  };
};

export const sumModifierEquipStatsBuffs = async (userId: string) => {
  const hero = await prisma.hero.findFirst({
    where: { userId },
    include: { buffs: { include: { modifier: true } }, baseStats: true },
  });
  if (!hero) {
    throw new Error('Hero not found  func: sumModifierEquipStatsBuffs');
  }

  const findAllEquips = await prisma.equipment.findMany({
    where: { heroId: hero.id },
    include: {
      inventoryItem: {
        include: { gameItem: { include: { modifier: true } } },
      },
    },
  });
  const allBuffs = hero.buffs.map((buff) => buff.modifier);
  const allEquipModifier = findAllEquips.map(
    (equip) => equip.inventoryItem?.gameItem?.modifier
  );

  const sumModifier = sumModifiers(
    ...(allEquipModifier.length === 0 ? [zeroModifiers()] : allEquipModifier),
    ...(allBuffs.length === 0 ? [zeroModifiers()] : allBuffs),
    {
      ...hero.baseStats,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    }
  );

  const sumModifierByCalculateHpMana = calculateHpAndMana(sumModifier);
  return sumModifierByCalculateHpMana;
};

const zeroModifiers = () => {
  return {
    minDamage: 0,
    maxDamage: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    constitution: 0,
    luck: 0,

    maxHealth: 0,
    maxMana: 0,
    manaRegeneration: 0,
    healthRegeneration: 0,
    armor: 0,
    magicResistances: 0,
    evasion: 0,
    spellDamage: 0,
    spellDamageCritPower: 0,
    spellDamageCritChance: 0,
    meleeDamage: 0,
    meleeDamageCritPower: 0,
    meleeDamageCritChance: 0,
    duration: 0,
  };
};
export function calculateTimeRemaining(dungeonSession: DungeonSession) {
  const currentTime = Date.now();
  const createdAtTime = new Date(dungeonSession?.createdAt).getTime();
  const timeElapsed = currentTime - createdAtTime;
  return Math.max(dungeonSession?.duration * 60000 - timeElapsed, 0);
}

export async function addBuffsTimeRemaining(heroId: string) {
  try {
    const buffs = await prisma.buff.findMany({
      where: { heroId },
      include: { modifier: true, gameItem: true },
    });

    const newBuffs = buffs.map((buff) => {
      const currentTime = Date.now();
      const createdAtTime = new Date(buff.createdAt).getTime();
      const timeElapsed = currentTime - createdAtTime;
      const timeRemaining = Math.max(buff.duration - timeElapsed, 0);

      return {
        ...buff,
        timeRemaining,
      };
    });
    return newBuffs;
  } catch (error) {
    console.error(error);
  }
}

export const getMapJson = (dungeonId: string): TileMap => {
  const dung: { [key: string]: any } = {
    '672cc47ca5a57325eedefbf5': require('../json/Lair of Darkness.json'),
    'test': require('../json/test-dung.json'),
    '67306f9f2563f8e4e84e52d1': '',
  };
  return dung[dungeonId];
};

export const building2DMap = (tiles: Tile[], jsonMap: TileMap) => {
  const dungeonMap: Tile[][] = [];
  for (let i = 0; i < jsonMap.height; i++) {
    const row: any[] = [];
    for (let j = 0; j < jsonMap.width; j++) {
      row.push(null);
    }
    dungeonMap.push(row);
  }
  tiles.forEach((tile) => {
    const x = tile.x;
    const y = tile.y;

    dungeonMap[y][x] = tile;
  });

  return dungeonMap;
};

export const to2DArray = (tiles: Tile[], width: number): Tile[][] => {
  console.log(width)
  return Array.from({ length: Math.ceil(tiles.length / width) }, (_, i) =>
    tiles.slice(i * width, i * width + width)
  );
};
