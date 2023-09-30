const mongoose = require("mongoose");
const userSchema = require("./userSchema").userSchema;

const deletedUserSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  user: userSchema,
  dateDeleted: {
    type: Date,
    immutable: true,
    default: () => Date.now(),
  },
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
