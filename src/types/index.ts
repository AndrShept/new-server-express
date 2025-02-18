import { Hero, Prisma, TileType } from '@prisma/client';

export interface TileMap {
  compressionlevel: number;
  height: number;
  infinite: boolean;
  layers: Layer[];
  nextlayerid: number;
  nextobjectid: number;
  orientation: string;
  renderorder: string;
  tiledversion: string;
  tileheight: number;
  tilesets: Tileset[];
  tilewidth: number;
  type: string;
  version: string;
  width: number;
}

export interface Layer {
  draworder?: string; // Присутній тільки для "objectgroup"
  id: string;
  name: TileType;
  objects: TileObject[];
  data: number[];
  height: number;
  opacity: number;
  type: 'objectgroup' | 'tilelayer';
  visible: boolean;
  width?: number;
  x: number;
  y: number;
}

export interface TileObject {
  gid: number;
  height: number;
  id: number;
  name: TileType;
  rotation?: number;
  type?: string;
  visible: boolean;
  width: number;
  x: number;
  y: number;
  hero?: Hero | null;
}

export interface Tileset {
  columns: number;
  firstgid: number;
  image: string;
  imageheight: number;
  imagewidth: number;
  margin: number;
  name: string;
  spacing: number;
  tilecount: number;
  tileheight: number;
  tilewidth: number;
}

export type HeroWithModifier = Prisma.HeroGetPayload<{
  include: {
    modifier: true;
  };
}>;

export type PhotoWithRelations = Prisma.PhotoGetPayload<{
  include: {
    comments: true;
    likes: true;
    _count: { select: { view: true; comments: true; likes: true } };
  };
}>;

export type TileWithObject = Prisma.TileGetPayload<{
  include: {
    object: true;
  };
}>;
export type TileWithEntities = Prisma.TileGetPayload<{
  include: {
    hero: true;
    object: true;
    monster: true;
  };
}>;

export interface ISysMessages<T = any> {
  message: string;
  data?: T | null;
  type: SysMessageType;
  success?: boolean;
  createdAt?: number;
}
export enum SysMessageType {
  'INFO' = 'INFO',
  'WARNING' = 'WARNING',
  'ERROR' = 'ERROR',
  'SUCCESS' = 'SUCCESS',
}
