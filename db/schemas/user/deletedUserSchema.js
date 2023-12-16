const mongoose = require("mongoose");
const userSchema = require("./userSchema").userSchema;

const deletedUserSchema = new mongoose.Schema(userSchema.obj);

const deletedUserModel = mongoose.model(
  "deletedUser",
  deletedUserSchema,
  process.env.DELETED_USERS_COLLECTION
);

module.exports = {
  deletedUserSchema,
  deletedUserModel,
};
