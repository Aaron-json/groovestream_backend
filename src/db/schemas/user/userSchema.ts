import mongoose from "mongoose";
import { userPlaylistSchema } from "../media/playlist.js";
import { audioFileSchema } from "../media/audioFile.js";
import * as uuid from "uuid";
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

export const userSchema = new mongoose.Schema(
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
    playlists: {
      type: [userPlaylistSchema],
      default: [],
    },
    sharedPlaylists: {
      type: [String],
      default: [],
      ref: "sharedPlaylist",
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

export const userModel = mongoose.model(
  "User",
  userSchema,
  process.env.USERS_COLLECTION
);
