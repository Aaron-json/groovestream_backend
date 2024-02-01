const mongoose = require("mongoose");
const uuid = require("uuid");
const friendSchema = new mongoose.Schema(
  {
    // subdocument
    friendID: {
      index: true,
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
  // subdocument

  senderID: {
    index: true,
    required: true,
    type: mongoose.Schema.Types.String,
    ref: "User"
  }
}, {
  _id: false,
  timestamps: true
}
)

const playlistInviteSchema = new mongoose.Schema({
  // subdocument
  senderID: {
    index: true,
    required: true,
    type: mongoose.Schema.Types.String,
    ref: "User"
  },
  playlistID: {
    index: true,
    required: true,
    unique: true, // you can only have one invite to the same playlist at a time
    type: mongoose.Schema.Types.String,
    ref: "sharedPlaylist",
  }
}, {
  _id: false,
  timestamps: true,
})

const userSocialsSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.String,
    default: () => uuid.v4(),
  },
  userID: {
    required: true,
    index: true,
    unique: true,
    type: mongoose.Schema.Types.String,
    ref: "User"
  },
  friends: {
    type: [friendSchema],
    default: []
  },
  friendRequests: {
    type: [friendRequestSchema],
    default: []
  },
  playlistInvites: {
    type: [playlistInviteSchema],
    default: []
  }
})

const userSocialsModel = mongoose.model("userSocials", userSocialsSchema, "userSocials")
module.exports = {
  userSocialsSchema,
  userSocialsModel,
};
