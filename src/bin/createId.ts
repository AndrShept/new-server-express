import { ObjectId } from 'bson';

export const createIdBson = () => {
  return new ObjectId().toString();
};
