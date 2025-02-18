import { SessionStatus } from '@prisma/client';
import z from 'zod';

const statusArr = Object.values(SessionStatus) as [string, ...string[]];

export const updateDungeonSessionStatusDTO = z.object({
  status: z.enum(statusArr),
  dungeonSessionId: z.string(),
});

export const updateDungeonSessionStatusSchema = z.object({
  body: updateDungeonSessionStatusDTO,
});

export const getDungeonMapDTO = z.object({
  dungeonSessionId: z.string(),
});

export const getDungeonMapSchema = z.object({
  params: getDungeonMapDTO,
});
