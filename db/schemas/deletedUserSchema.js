const mongoose = require("mongoose");
const uuid = require("uuid")
const userSchema = require("./userSchema").userSchema;

const deletedUserSchema = new mongoose.Schema({
    _id: {
      type: String,
      default: () => uuid.v4(),
    },
    user: userSchema,
    dateDeleted: {
      type: Date,
      immutable: true,
      default: () => Date.now(),
    },
  },
  {
    timestamps: true,
  });

const deletedUserModel = mongoose.model(
  "deletedUser",
  deletedUserSchema,
  process.env.DELETED_USERS_COLLECTION
);

module.exports = {
  deletedUserSchema,
  deletedUserModel,
};
