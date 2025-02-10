import { ObjectId } from 'bson';

export const getIdBson = () => {
  return new ObjectId().toString();
};
