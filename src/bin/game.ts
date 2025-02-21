import { Socket } from 'socket.io';
import { heroRegeneration } from './heroRegeneration';
import { initDungeon } from './initDungeon';
import { moveHero } from './moveHero';
import { HeroWithModifier } from '../types';
import { socketJoinRoom } from '../sockets/socketJoinRoom';

export const game = async (
  username: string,
  socket: Socket,
  hero: HeroWithModifier
) => {
  heroRegeneration(username, socket, hero);
  initDungeon(socket, hero);
  moveHero(socket, hero);
  socketJoinRoom(socket);
};
