const mongoose = require("mongoose");
const { userPlaylistSchema } = require("./playlistSchema");
const { audioFileSchema } = require("./audioFileSchema");
const { friendSchema } = require("./friend");
const uuid = require("uuid");
const recentSearchesSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuid.v4(),
  },
  mediaID: {
    // String version of the media's ID
    type: String,
    required: true,
    immutable: true,
  },
  mediaType: {
    type: Number,
    required: true,
    enum: [0, 1, 2, 3], // TODO add more types as needed (artist?)
    immutable: true,
  },
  dateCreated: {
    type: Date,
    default: () => Date.now(),
    immutable: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuid.v4(),
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: mongoose.SchemaTypes.Date,
      required: true,
    },
    // string corresponding to its name in storage

    friends: {
      type: [friendSchema],

      default: [],
    },
    playlists: {
      type: [userPlaylistSchema],
      default: [],
    },
    audioFiles: {
      type: [audioFileSchema],
      default: [],
    },
    recentSearches: {
      type: [recentSearchesSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

function dateGetter(dateString) {
  return new Date(dateString).getTime();
}

const userModel = mongoose.model(
  "User",
  userSchema,
  process.env.USERS_COLLECTION
);

// exports the model and the schema
module.exports = {
  userModel,
  userSchema,
};
