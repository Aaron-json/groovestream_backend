import mongoose from "mongoose";
import * as uuid from "uuid";

export const audioFileSchema = new mongoose.Schema(
  {
    // media schemas contain a type to identify them.
    // 0 - audioFile
    // 1 - playlist
    // 2 - playlist audioFile
    // 3 - shared playlist
    // 4 - shared playlist audioFile
    _id: {
      type: mongoose.Schema.Types.String,
      default: () => uuid.v4(),
    },
    type: {
      type: mongoose.Schema.Types.Number,
      default: 0,
      immutable: true,
    },
    filename: {
      type: mongoose.Schema.Types.String,
      required: true,
    },
    title: {
      type: mongoose.Schema.Types.String,
      default: null,
    },
    album: {
      type: mongoose.Schema.Types.String,
      default: null,
    },
    artists: {
      type: mongoose.SchemaTypes.Array,
      default: null,
    },
    trackNumber: {
      type: String,
      default: null,
    },
    genre: {
      type: String,
      default: null,
    },
    icon: {
      mimeType: {
        type: String,
        default: null,
      },
      data: {
        type: mongoose.SchemaTypes.String,
        default: null,
        //   get: function (data) {
        //     return Buffer(data).toString('base64'); // convert buffer to base64 string
        //   },
        //   set: function (data) {
        //     return data
        //   }
      },
    },
    paybackCount: {
      type: Number,
      default: 0,
    },
    lastPlayed: {
      type: Date,
      default: null,
    },
    format: {
      type: mongoose.SchemaTypes.Mixed,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);
