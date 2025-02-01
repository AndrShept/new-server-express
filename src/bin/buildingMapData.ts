import { Tile } from '@prisma/client';
import { Layer } from '../types';
import { getMapJson } from './utils';

export const getLayerObject = (
  layer: Layer | undefined,
  dungeonSessionId: string,
  tileWidth: number,
  tileHeight: number
) => {
  if (layer?.name === 'object') {
    return layer.objects.map((object) => ({
      ...object,

      gid: object.gid - 1,
      x: object.x / object.width ,
      y: object.x / object.height,
    }));
  }

  return layer?.data
    .map((item, idx) => {
      if (item === 0) return null;
      return {
        dungeonSessionId,
        gid: item - 1,
        height: tileHeight,
        width: tileWidth,
        name: layer.name,

        x: (idx ) % layer.width!,
        y: idx / layer.height,
      };
    })
    .filter((item) => item) as Tile[];
};

export const buildingMapData = (
  dungeonSessionId: string,
  dungeonId: string
) => {
  const testMap = getMapJson(dungeonId);
  const findObjects = testMap.layers.find((item) => item.name === 'object');
  const decorLayer = testMap.layers.find((item) => item.name === 'decor');
  const findGround = testMap.layers.find((item) => item.name === 'ground');
  const findWall = testMap.layers.find((item) => item.name === 'wall');
  const dataDecors = getLayerObject(
    decorLayer,
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

  return [...dataGrounds, ...dataObjects, ...dataDecors, ...dataWalls];
};
