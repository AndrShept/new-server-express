import { NextFunction, Request, Response } from 'express';
import { getLevelStatsPoints } from '../../bin/level';
import {
  sumModifiers,
  getHeroId,
  getHero,
  sumModifierEquipStatsBuffs,
  addModifiers,
  addBuffsTimeRemaining,
  subtractModifiers,
  calculateTimeRemaining,
} from '../../bin/utils';
import { prisma } from '../../utils/prisma';
import { ItemType, Modifier } from '@prisma/client';
import { HeroWithModifier } from '../../types';

export const HeroController = {
  getMyHero: async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const heroId = req.hero.id;

    if (!heroId) {
      return res.status(404).json('Hero not found');
    }
    const sumModifier = await sumModifierEquipStatsBuffs(userId);
    const { id, ...remainingFieldsModifier } = sumModifier as Modifier;

    try {
      const dungeonSessions = await prisma.dungeonSession.findMany({
        where: { status: 'INPROGRESS', heroId },
        include: { dungeon: true, dungeonHeroes: true },
      });

      const hero = await prisma.hero.update({
        where: { id: heroId },
        data: { modifier: { update: { ...remainingFieldsModifier } } },

        include: {
          modifier: true,
          baseStats: true,
          equipments: {
            include: {
              inventoryItem: {
                include: { gameItem: { include: { modifier: true } } },
              },
            },
          },
          inventorys: {
            include: { gameItem: { include: { modifier: true } } },
            orderBy: { updatedAt: 'asc' },
          },
        },
      });
      const updatedDungeonSessions = dungeonSessions.map((dungeon) => ({
        ...dungeon,
        timeRemaining: calculateTimeRemaining(dungeon),
      }));
      if (updatedDungeonSessions[0]?.timeRemaining === 0) {
        await prisma.dungeonSession.update({
          where: { id: updatedDungeonSessions[0].id },
          data: {
            status: 'FAILED',
            endTime: new Date().toISOString(),
          },
        });
      }
      res.status(200).json({
        ...hero,
        buffs: await addBuffsTimeRemaining(heroId),
        dungeonSessions: updatedDungeonSessions,
      });
    } catch (error) {
      next(error);
    }
  },

  createHero: async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const body = req.body;

    const {
      name,
      statPoint: statPoints,
      avatarUrl,
      breastplate,
      weapon,
      modifier,
    } = body;

    try {
      const heroNameExist = await prisma.hero.findUnique({
        where: { name },
      });
      if (heroNameExist) {
        return res.status(409).json({
          success: false,
          message:
            'There already a character with this nickname, please try another one.',
        });
      }

      const hero = await prisma.hero.create({
        data: {
          statsPoints: statPoints,
          name,
          avatarUrl,
          health: 50,
          mana: 50,
          gold: 100,
          freeStatsPoints: 10,
          baseStats: { create: {} },
          user: {
            connect: {
              id: userId,
            },
          },
        },
      });
      await prisma.hero.update({
        where: { id: hero.id },
        data: {
          modifier: {
            upsert: {
              create: modifier,
              update: modifier,
            },
          },
        },
      });

      if (weapon && breastplate) {
        await prisma.inventoryItem.createMany({
          data: [
            {
              heroId: hero.id,
              gameItemId: weapon.id,
            },
            {
              heroId: hero.id,
              gameItemId: breastplate.id,
            },
          ],
        });
      }

      res.status(201).json(hero);
    } catch (error) {
      next(error);
    }
  },

  equipHeroItem: async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const heroId = req.hero.id;
    const hero = req.hero;
    const { inventoryItemId, slot } = req.body;
    if (!inventoryItemId) {
      return res.status(400).json({
        success: false,
        message: 'inventoryItemId not found',
      });
    }
    if (!slot) {
      return res.status(400).json({
        success: false,
        message: 'slot not found',
      });
    }

    try {
      const newEquipment = await prisma.equipment.create({
        data: {
          slot,
          heroId,
          inventoryItemId,
        },
      });

      const sumModifier = await sumModifierEquipStatsBuffs(userId);
      const { id, ...remainingFieldsModifier } = sumModifier as Modifier;

      await prisma.hero.update({
        where: { id: heroId },
        data: {
          health: Math.min(sumModifier?.maxHealth ?? 0, hero?.health ?? 0),
          mana: Math.min(sumModifier?.maxMana ?? 0, hero?.mana ?? 0),
          modifier: { update: { ...remainingFieldsModifier } },
          inventorys: {
            update: {
              where: { id: inventoryItemId },
              data: { isEquipped: true },
            },
          },
        },
      });
      res.status(200).json({
        success: true,
        message: 'Item has been equipped',
        data: newEquipment,
      });
    } catch (error) {
      next(error);
    }
  },
  unEquipHeroItem: async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.userId;
    const heroId = req.hero.id;
    const hero = req.hero;
    const { inventoryItemId } = req.body;

    if (!inventoryItemId) {
      return res.status(404).json({
        success: false,
        message: 'inventoryItemId not found',
      });
    }

    try {
      const deletedEquip = await prisma.equipment.deleteMany({
        where: {
          heroId,
          inventoryItemId,
        },
      });

      const sumModifier = await sumModifierEquipStatsBuffs(userId);
      const { id, ...remainingFieldsModifier } = sumModifier as Modifier;

      await prisma.hero.update({
        where: { id: heroId },
        data: {
          health: Math.min(sumModifier?.maxHealth ?? 0, hero.health),
          mana: Math.min(sumModifier?.maxMana ?? 0, hero.mana),

          modifier: {
            update: {
              ...remainingFieldsModifier,
            },
          },
          inventorys: {
            update: {
              where: { id: inventoryItemId },
              data: { isEquipped: false },
            },
          },
        },
      });
      res.status(200).json({
        success: true,
        message: 'Item has been unEquipped',
        data: deletedEquip,
      });
    } catch (error) {
      next(error);
    }
  },

  addHeroItemInventory: async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const body = req.body;
    const hero = req.hero;

    const { gameItemId } = body;
    if (!gameItemId) {
      return res
        .status(400)
        .json({ success: false, message: 'gameItemId not found' });
    }

    try {
      const freeInvSlots = await prisma.inventoryItem.count({
        where: { isEquipped: false, heroId: hero.id },
      });

      if (hero.inventorySlots < freeInvSlots) {
        return res.status(409).json({
          success: false,
          message: 'Item cannot be acquired because inventory is full',
        });
      }
      const gameItem = await prisma.gameItem.findUnique({
        where: { id: gameItemId },
      });

      if (!gameItem) {
        return res.status(409).json({
          success: false,
          message: 'gameItem not found',
        });
      }

      if (gameItem.price! > hero.gold) {
        return res.status(400).json({
          success: false,
          message: 'Not enough gold',
        });
      }

      const isPotionMiscType =
        gameItem.type === ItemType.POTION || gameItem.type === ItemType.MISC;
      const existInventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          gameItemId,
          heroId: hero.id,
        },
        include: { gameItem: true },
      });
      if (isPotionMiscType && existInventoryItem) {
        await prisma.$transaction([
          prisma.inventoryItem.updateMany({
            where: {
              heroId: hero.id,
              gameItemId,
            },
            data: { quantity: { increment: 1 } },
          }),
          prisma.hero.update({
            where: { id: hero.id },
            data: { gold: { decrement: gameItem.price ? gameItem.price : 0 } },
          }),
        ]);
        return res.status(201).json({
          success: true,
          message: 'Congratulations! You have acquired',
          data: existInventoryItem,
        });
      }

      const [newItemInventory, _] = await prisma.$transaction([
        prisma.inventoryItem.create({
          data: {
            gameItemId,
            heroId: hero.id,
            isCanEquipped: !isPotionMiscType,
          },
          include: { gameItem: true },
        }),
        prisma.hero.update({
          where: { id: hero.id },
          data: { gold: { decrement: gameItem.price ? gameItem.price : 0 } },
        }),
      ]);
      res.status(201).json({
        success: true,
        message: 'Congratulations! You have acquired',
        data: newItemInventory,
      });
    } catch (error) {
      next(error);
    }
  },

  drinkPotion: async (req: Request, res: Response, next: NextFunction) => {
    const { inventoryItemId } = req.body;
    const hero = req.hero as HeroWithModifier;

    if (!inventoryItemId) {
      return res.status(400).json('inventoryItemId not found');
    }
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { gameItem: { include: { modifier: true } } },
    });
    if (!inventoryItem || !inventoryItem.gameItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const { maxHealth, maxMana, duration } = inventoryItem.gameItem.modifier!;
    const isHealthFull = hero.health === hero.modifier!.maxHealth;
    const isManaFull = hero.mana === hero.modifier!.maxMana;

    if (
      (isHealthFull && !maxMana && !duration) ||
      (isManaFull && !maxHealth && !duration)
    ) {
      return res.status(409).json({
        success: false,
        message: `Your ${
          maxMana ? 'mana' : 'health'
        } is already full. Nothing to restore.`,
      });
    }
    const updateQuantity =
      inventoryItem.quantity! > 1
        ? {
            update: {
              where: { id: inventoryItemId },
              data: { quantity: { decrement: 1 } },
            },
          }
        : { delete: { id: inventoryItemId } };
    const sumModifier = addModifiers(
      hero.modifier!,
      inventoryItem.gameItem.modifier
    );

    const { id, ...remainingFieldsModifier } = sumModifier as Modifier;
    try {
      const findExistBuff = await prisma.buff.findFirst({
        where: { gameItemId: inventoryItem.gameItemId },
      });
      if (findExistBuff) {
        await prisma.buff.delete({
          where: { id: findExistBuff.id },
        });
      }

      await prisma.hero.update({
        where: { id: hero.id },

        data: {
          health: {
            set: Math.min(
              hero.health + (maxHealth ?? 0),
              hero.modifier!.maxHealth ?? 0
            ),
          },
          mana: {
            set: Math.min(
              hero.mana + (maxMana ?? 0),
              hero.modifier!.maxMana ?? 0
            ),
          },
          modifier: inventoryItem.gameItem.modifier?.duration
            ? {
                update: { ...remainingFieldsModifier },
              }
            : undefined,
          buffs: inventoryItem.gameItem.modifier?.duration
            ? {
                create: {
                  duration: inventoryItem.gameItem.modifier.duration,
                  imageUrl: inventoryItem.gameItem.imageUrl,
                  name: inventoryItem.gameItem.name,
                  gameItemId: inventoryItem.gameItemId,
                  modifierId: inventoryItem.gameItem.modifierId!,
                },
              }
            : undefined,
          inventorys: updateQuantity,
        },
      });

      res.status(200).json({
        success: true,
        message: 'You successfully drank ',
        data: inventoryItem,
      });
    } catch (error) {
      next(error);
    }
  },

  removeBuff: async (req: Request, res: Response, next: NextFunction) => {
    const { buffId } = req.body;
    const hero = req.hero as HeroWithModifier;

    if (!buffId) {
      return res.status(404).json('buffId not found');
    }
    const buff = await prisma.buff.findFirst({
      where: { gameItemId: buffId },
      include: { modifier: true },
    });
    if (!buff) {
      return res.status(404).json('buff not found');
    }

    const sumModifier = subtractModifiers(hero.modifier!, buff.modifier);
    const { id, ...remainingFieldsModifier } = sumModifier;

    try {
      await prisma.hero.update({
        where: { id: hero.id },
        data: {
          buffs: { delete: { id: buff.id } },

          modifier: { update: { ...remainingFieldsModifier } },
        },
      });

      await prisma.hero.update({
        where: { id: hero.id },
        data: {
          health: Math.min(hero.health, hero.modifier!.maxHealth ?? 0),
          mana: Math.min(hero.mana, hero.modifier!.maxMana ?? 0),
        },
      });

      res.status(200).json({
        message: 'Buff success deleted',
      });
    } catch (error) {
      next(error);
    }
  },

  updateHero: async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    const heroId = req.hero.id;

    const { modifier, baseStats, ...allBody } = body;

    try {
      const updatedHero = await prisma.hero.update({
        where: { id: heroId },
        data: {
          ...allBody,
          modifier: { update: { ...modifier } },
          baseStats: { update: { ...baseStats } },
        },
      });
      res.status(200).json(updatedHero);
    } catch (error) {
      next(error);
    }
  },
  resetStats: async (req: Request, res: Response, next: NextFunction) => {
    const hero = req.hero;

    try {
      if (hero.gold < 100) {
        return res.status(400).json({
          success: false,
          message: 'Not enough gold to reset hero stats ',
        });
      }

      const updatedHero = await prisma.hero.update({
        where: { id: hero.id },
        data: { ...getLevelStatsPoints(hero.level), gold: { decrement: 100 } },
      });
      res.status(200).json({
        success: true,
        message: 'Hero stats have been successfully reset. ',
        data: updatedHero,
      });
    } catch (error) {
      next(error);
    }
  },
};
