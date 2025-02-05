import { Tile, TileType } from '@prisma/client';
import { Layer } from '../types';
import { getMapJson } from './utils';
import { prisma } from '../utils/prisma';
import { ObjectId } from 'bson';
import { createIdBson } from './createId';

export const getLayerObject = (
  layer: Layer | undefined,
  dungeonSessionId: string,
  tileWidth: number,
  tileHeight: number
) => {
  if (layer?.name === 'object') {
    return layer.objects.map((object) => ({
      ...object,
      id: createIdBson(),
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
        gid: item - 1,
        height: tileHeight,
        width: tileWidth,
        name: layer.name,

        x: idx % layer.width!,
        y: Math.floor(idx / layer.height),
      };
    })
    .filter((item) => item) as Tile[];
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

  await prisma.tile.createMany({
    data: dataObjects,
  });

  const newArray = dataGrounds.map((tile) => {
    const findObject = dataObjects.find(
      (object) => tile.x === object.x && tile.y === object.y
    );

    if (findObject) {
      return {
        ...tile,
        objectId: findObject.id,
      };
    }
    return tile as Tile;
  });

  await prisma.tile.createMany({
    data: [...newArray, ...dataDecors],
  });
};
