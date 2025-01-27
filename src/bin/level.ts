export const getLevelStatsPoints = (level:number) => {
  const defaultBaseStats = {
    strength: 10,
    dexterity: 10,
    intelligence: 10,
    constitution: 10,
    luck: 5,
  };
  return {
    statsPoints: level * 10,
    freeStatsPoints: level * 10,
    baseStats: {
      upsert: {
        create: defaultBaseStats,
        update: defaultBaseStats,
      },
    },
  };
};
