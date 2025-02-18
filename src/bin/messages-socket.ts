import { Socket } from 'socket.io';
import { io } from '../server';

export const messagesSocket = (socket: Socket, userId: string) => {
  socket.on('msg', async (msg) => {
    io.emit(msg.conversationId, msg);
    if (msg.conversation.receiverId === userId) {
      io.emit(msg.conversation.senderId, msg);
    } else {
      io.emit(msg.conversation.receiverId, msg);
    }
  });
};
