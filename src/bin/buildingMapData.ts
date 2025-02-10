import { Prisma, Tile } from '@prisma/client';
import { Layer } from '../types';
import { getMapJson, getRandomValue, rand } from './utils';
import { prisma } from '../utils/prisma';
import { getIdBson } from './getIdBson';

export const getLayerObject = (
  layer: Layer | undefined,
  dungeonSessionId: string,
  tileWidth: number,
  tileHeight: number
) => {
  if (layer?.name === 'object') {
    return layer.objects.map((object) => ({
      ...object,
      id: getIdBson(),
      dungeonSessionId,
      gid: object.gid - 1,
      x: object.x / object.width,
      y: object.y / object.height - 1,
      name: object.name,
    }));
  }

  return layer?.data
    .map((item, idx) => {
      if (item === 0) return null;
      return {
        dungeonSessionId,
        id: getIdBson(),
        gid: item - 1,
        height: tileHeight,
        width: tileWidth,
        name: layer.name,
        x: idx % layer.width!,
        y: Math.floor(idx / layer.height),
      };
    })
    .filter(Boolean) as Tile[];
};

export const buildingMapData = async (
  dungeonSessionId: string,
  dungeonId: string
) => {
  const testMap = getMapJson(dungeonId);
  const findObjects = testMap.layers.find((item) => item.name === 'object');
  const findDecor = testMap.layers.find((item) => item.name === 'decor');
  const findGround = testMap.layers.find((item) => item.name === 'ground');
  const findWall = testMap.layers.find((item) => item.name === 'wall');
  const dataDecors = getLayerObject(
    findDecor,
    dungeonSessionId,
    testMap.tilewidth,
    testMap.tileheight
  );
  const dataGrounds = getLayerObject(
    findGround,
    dungeonSessionId,
    testMap.tilewidth,
    testMap.tileheight
  );
  const dataObjects = getLayerObject(
    findObjects,
    dungeonSessionId,
    testMap.tilewidth,
    testMap.tileheight
  );
  const dataWalls = getLayerObject(
    findWall,
    dungeonSessionId,
    testMap.tilewidth,
    testMap.tileheight
  );
  const tilesData = dataWalls.length
    ? [...dataObjects, ...dataWalls]
    : dataObjects;
  await prisma.tile.createMany({
    data: tilesData,
  });


  const objectsTile = dataGrounds.map((tile) => {
    const findObject = tilesData.find(
      (object) => tile.x === object.x && tile.y === object.y
    );
 

      if (findObject) {
        return {
          ...tile,
          objectId: findObject.id,
        }

      }
    return tile as Tile
    
  });
  console.time('create-map');
  await prisma.tile.createMany({
    data: [...objectsTile, ...dataDecors],
  });
  console.timeEnd('create-map');


};
