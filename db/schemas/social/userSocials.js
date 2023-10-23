const mongoose = require("mongoose");

const friendSchema = new mongoose.Schema(
  {
    friendID: {
      type: mongoose.Schema.Types.String,
      required: true,
      ref: "User",
    },
  },
  {
    _id: false,
    timestamps: true,
  }
);

const friendRequestSchema = new mongoose.Schema({
    senderID: {
      required: true,
      type: mongoose.Schema.Types.String,
      ref: "User"
    }
  }, {
    _id: false,
    timestamps: true
  }
)

const userSocialsSchema = new mongoose.Schema({
  userID: {
    required: true,
    index: true,
    unique: true,
    type: mongoose.Schema.Types.String,
  },
  friends: {
    type: [friendSchema],
    default: []
  },
  friendRequests: {
    type: [friendRequestSchema],
    default: []
  },
})

const userSocialsModel = mongoose.model("userSocials", userSocialsSchema, "userSocials")
module.exports = {
  userSocialsSchema,
  userSocialsModel,
};
