import express from 'express';
import { upload, uploadAndOptimize } from '../middleware/multer';
import { UserController } from '../controllers/user-controller';
import { authToken } from '../middleware/auth';
import { PhotoController } from '../controllers/photo-controller';
import { PostController } from '../controllers/post-controller';
import { CommentController } from '../controllers/comment-controller';
import { ReplyController } from '../controllers/reply-controller';
import { LikeController } from '../controllers/like-controller';
import { FollowController } from '../controllers/follow-conroller';
import { ConversationController } from '../controllers/conversation-controller';
import { MessageController } from '../controllers/message-controller';
import { FavoritePostController } from '../controllers/favoritePost-controller';
import { NotificationController } from '../controllers/notification-controller';
import { HeroController } from '../controllers/game/hero-controller';
import { ItemController } from '../controllers/game/item-controller';
import { DungeonController } from '../controllers/game/dungeon-controller';
import { getHero } from '../middleware/hero';
import { validate } from '../middleware/validate';
import { updateDungeonSessionStatusSchema } from '../dto/dungeon';
import { DungeonPartyController } from '../controllers/game/dungeon-party';
import {
  createDungeonPartyHeroDTOSchema,
  deleteDungeonPartyHeroDTOSchema,
  getDungeonPartyHeroByTermSchema,
  getDungeonPartySchema,
} from '../dto/dungeon-party';

export const router = express.Router();

//USER
router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.post('/reset-password', UserController.resetPassword);
router.put('/update-password', UserController.updatePassword);
router.get('/current', authToken, UserController.current);
router.get('/users/:searchValue?', authToken, UserController.getAllUsers);
router.get('/users-following', authToken, UserController.getAllFollowingUsers);
router.get('/users/:id', authToken, UserController.getUserById);
router.get(
  '/users-username/:username',
  authToken,
  UserController.getUserByUsername
);
router.put(
  '/users/:id',
  authToken,
  upload.single('file'),
  uploadAndOptimize,
  UserController.updateUser
);
router.put('/users-online', authToken, UserController.userOnline);
router.put('/users-offline/:userId', UserController.userOffline);

//PHOTO
router.post(
  '/users-photo',
  authToken,
  upload.array('files'),
  uploadAndOptimize,

  PhotoController.addPhotos
);
router.get(
  '/users-photos/:username',
  authToken,
  PhotoController.getPhotosByUsername
);
router.get('/users-photo/:photoId', authToken, PhotoController.getPhotosById);
router.delete('/delete-photos', authToken, PhotoController.deletePhotos);

//POST
router.get('/posts', authToken, PostController.getPosts);
router.get('/posts-user/:username', authToken, PostController.getAllUserPosts);
router.get('/favorite-posts', authToken, PostController.getFavoritePosts);
router.get('/posts/:id', authToken, PostController.getPostById);
router.post(
  '/posts',
  authToken,
  upload.single('file'),
  uploadAndOptimize,
  PostController.addPost
);
router.delete('/posts/:id', authToken, PostController.deletePost);
router.put('/posts/:id', authToken, PostController.editPost);

//COMMENT
router.post('/comments', authToken, CommentController.addComment);
router.get('/comments/:id', authToken, CommentController.getComments);
router.delete('/comments/:id', authToken, CommentController.deleteComment);
router.put('/comments/:id', authToken, CommentController.editComment);

//Reply
router.post('/reply', authToken, ReplyController.addReply);
router.get(
  '/reply/:commentId',
  authToken,
  ReplyController.getReplysByCommentId
);
router.delete('/reply/:commentId', authToken, ReplyController.deleteReply);
// router.put('/comments/:id', authToken, CommentController.editComment);

//ADD LIKE
router.post('/like/:id', authToken, LikeController.addLike);

//FOLLOW
router.post('/follow/:id', authToken, FollowController.followUser);

//CONVERSATION
router.get(
  '/conversations',
  authToken,
  ConversationController.getAllConversations
);
router.get(
  '/conversations/:conversationId',
  authToken,
  ConversationController.getConversationById
);
router.post(
  '/conversations',
  authToken,
  ConversationController.addConversation
);
router.delete(
  '/conversations',
  authToken,
  ConversationController.deleteConversation
);
router.put(
  '/conversations/:conversationId',
  authToken,
  ConversationController.isReadMessages
);

//MESSAGES
router.post(
  '/messages',
  authToken,
  upload.single('file'),
  uploadAndOptimize,
  MessageController.addMessage
);
router.put('/messages/:messageId', authToken, MessageController.editMessage);
router.put(
  '/messages-isRead/:messageId',
  authToken,
  MessageController.isReadOnceMessage
);
router.delete(
  '/messages/:messageId',
  authToken,
  MessageController.deleteMessage
);

//FAVORITE-POST
router.post(
  `/favorite-posts/:postId`,
  authToken,
  FavoritePostController.addFavorite
);
//NOTIFICATION
router.get(
  `/notifications`,
  authToken,
  NotificationController.getNotifications
);
router.delete(
  `/notifications`,
  authToken,
  NotificationController.clearAllNotifications
);
router.put(
  `/notifications/:notificationId`,
  authToken,
  NotificationController.updateNotification
);

/////////////////////////// --- GAME ---- //////////////////////////

//HERO
router.get('/hero', authToken, getHero, HeroController.getMyHero);
router.post('/hero', authToken, HeroController.createHero);
router.post('/hero-equip', authToken, getHero, HeroController.equipHeroItem);
router.post(
  '/hero-unEquip',
  authToken,
  getHero,
  HeroController.unEquipHeroItem
);
router.post('/drink-potion', authToken, getHero, HeroController.drinkPotion);
router.post(
  '/add-inventory',
  authToken,
  getHero,
  HeroController.addHeroItemInventory
);
router.put('/hero-update', authToken, getHero, HeroController.updateHero);
router.put('/reset-stats', authToken, getHero, HeroController.resetStats);
router.delete('/remove-buff', authToken, getHero, HeroController.removeBuff);

//ITEM
router.get('/items', authToken, ItemController.getAllItems);
router.get('/novice-items', authToken, ItemController.getNoviceItems);
router.post('/create-items', authToken, ItemController.createItem);
router.delete('/delete-item', authToken, ItemController.deleteItem);

//DUNGEON
router.get('/dungeons', authToken, DungeonController.getDungeons);
router.get(
  '/dungeons-session-status/:status',
  authToken,
  getHero,
  DungeonController.getAllDungeonsSessionInStatus
);
router.get(
  '/dungeons-session/:dungeonSessionId',
  authToken,
  getHero,
  DungeonController.getDungeonsSessionById
);
router.post(
  '/dungeons-session',
  authToken,
  getHero,
  DungeonController.createDungSession
);
router.put(
  '/dungeons-session-status',
  authToken,
  getHero,
  validate(updateDungeonSessionStatusSchema),
  DungeonController.updateDungeonSessionStatus
);
//DUNGEON-PARTY
router.get(
  '/dungeons-party/:dungeonSessionId',
  authToken,
  getHero,
  validate(getDungeonPartySchema),
  DungeonPartyController.getDungeonParty
);
router.get(
  '/dungeons-party-search/:searchTerm',
  authToken,
  getHero,
  validate(getDungeonPartyHeroByTermSchema),
  DungeonPartyController.getDungeonPartyHeroByTerm
);
router.post(
  '/dungeons-party',

  authToken,
  getHero,
  validate(createDungeonPartyHeroDTOSchema),
  DungeonPartyController.createDungeonPartyHero
);
router.delete(
  '/dungeons-party/:memberId',
  authToken,
  getHero,
  validate(deleteDungeonPartyHeroDTOSchema),
  DungeonPartyController.deleteDungeonPartyHero
);
