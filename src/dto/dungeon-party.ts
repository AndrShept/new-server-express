import z from 'zod';

export const getDungeonPartyDTO = z.object({
  dungeonSessionId: z.string(),
});

export const getDungeonPartySchema = z.object({
  params: getDungeonPartyDTO,
});
export const getDungeonPartyHeroByTermDTO = z.object({
  searchTerm: z.string().min(1).max(20),
});

export const getDungeonPartyHeroByTermSchema = z.object({
  params: getDungeonPartyHeroByTermDTO,
});
export const createDungeonPartyHeroDTO = z.object({
  dungeonSessionId: z.string(),
  heroId: z.string(),
});

export const createDungeonPartyHeroDTOSchema = z.object({
  body: createDungeonPartyHeroDTO,
});
export const deleteDungeonPartyHeroDTO = z.object({
  memberId: z.string(),
});

export const deleteDungeonPartyHeroDTOSchema = z.object({
  params: deleteDungeonPartyHeroDTO,
});
