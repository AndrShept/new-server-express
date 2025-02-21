import { Socket } from 'socket.io';
import { HeroWithModifier } from '../types';
import { io } from '../server';

export const initDungeon = async (socket: Socket, hero: HeroWithModifier) => {
  // socket.on('dungeon-init', async (dungeonSessionId) => {
  //   socket.join(dungeonSessionId);

  // });


};
