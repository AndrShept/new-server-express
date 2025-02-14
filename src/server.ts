import express from 'express';
import dotenv from 'dotenv';
import { router } from './routes';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { errorHandler } from './middleware/errorHandler';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { getHeroWithModifiers } from './bin/getHeroWithModifiers';
import { game } from './bin/game';
import { userOffline } from './bin/utils';
import { S3Client } from '@aws-sdk/client-s3';
import { databaseErrorHandler } from './middleware/databaseErrorHandler';
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());
app.use(cookieParser());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('dev'));
app.use('/api', router);
app.use(databaseErrorHandler);
app.use(errorHandler);

export const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true,
  },
});

io.on('connection', async (socket: Socket) => {
  const userId = socket.handshake.auth.userId;
  const username = socket.handshake.headers.username as string;
  console.log(`A user connected ${username}`);
  // if (userId) {
  //   userOnline(userId);
  // }
  const hero = await getHeroWithModifiers(username);
  if (hero) {
    game(username, socket, hero);
  }

  socket.on('msg', async (msg) => {
    io.emit(msg.conversationId, msg);
    if (msg.conversation.receiverId === userId) {
      io.emit(msg.conversation.senderId, msg);
    } else {
      io.emit(msg.conversation.receiverId, msg);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected ${username}`);
    if (userId) {
      userOffline(userId);
    }
  });
});

export const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});


server.listen(PORT, () => {
  console.log(`SERVER RUNNING... PORT: ${PORT}`);
});
