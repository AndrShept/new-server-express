import { Socket } from 'socket.io';
import { Hero } from '@prisma/client';

export const inviteToParty = (socket: Socket, hero: Hero) => {
  socket.on('invite-party', (invitedHero, callback) => {



  });
};

