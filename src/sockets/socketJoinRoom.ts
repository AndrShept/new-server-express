import { Socket } from 'socket.io';
import { io } from '../server';

export const socketJoinRoom = (socket: Socket) => {
  socket.on('join-room', (data: string) => {
    socket.join(data);
    const roomSize = io.sockets.adapter.rooms.get('join-room')?.size || 0;
    console.log(`${socket.id} приєднався до кімнати join-room Усього учасників: ${roomSize}`);
  });
};
