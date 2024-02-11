import mongoose from "mongoose";
import { userSchema } from "./userSchema.js";

export const deletedUserSchema = new mongoose.Schema(userSchema.obj);

export const deletedUserModel = mongoose.model(
  "deletedUser",
  deletedUserSchema,
  process.env.DELETED_USERS_COLLECTION
);
