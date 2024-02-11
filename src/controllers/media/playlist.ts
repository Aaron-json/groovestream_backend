import mongoose from "mongoose";
import { userModel } from "../../db/schemas/user/userSchema.js";
import { updateQueryOptions } from "../user/userController.js";
import { deleteAudioFileStorage } from "./global.js";
import { deletePlaylistAudioFileDb } from "./playlistAudioFile.js";

export const getPlaylistInfo = async (userID: string, playlistID: string) => {
  const user = await userModel.findById(userID, {
    playlists: {
      $elemMatch: {
        _id: playlistID,
      },
    },
  });
  if (!user) {
    throw new Error("user not found");
  }
  if (user.playlists.length === 0) {
    throw new Error("Playlist not found");
  }
  return user.playlists[0];
};

export const deletePlaylist = async (
  userID: string,
  playlistID: string,
  session?: mongoose.mongo.ClientSession
) => {
  // get the bucket and make the query to delete items
  console.log(userID, playlistID);
  const user = await userModel.findById(userID, {
    playlists: {
      $elemMatch: {
        _id: playlistID,
      },
    },
    _id: 0,
  });
  console.log(user);
  if (!user) {
    throw new Error("User not found");
  }
  if (user.playlists?.length === 0) {
    throw new Error("Playlist not found");
  }
  // get the playlist object to delete from the document
  const playlist = user.playlists[0];
  // delete every song in the playlist from storage then from database
  for (let i = 0; i < playlist.audioFiles.length; i++) {
    let audioFileID = playlist.audioFiles[i]._id?.toString()!;
    await deleteAudioFileStorage(userID, audioFileID);
    await deletePlaylistAudioFileDb(userID, playlistID, audioFileID);
  }
  // erase the whole playlist from the user playlists lists
  await userModel.updateOne(
    {
      _id: userID,
    },
    {
      $pull: {
        playlists: {
          _id: playlistID,
        },
      },
    }
  );
};

export const createPlaylist = async (userID: string, name: string) => {
  const query = await userModel.updateOne(
    { _id: userID },
    {
      $push: {
        playlists: {
          name,
        },
      },
    },
    updateQueryOptions
  );
};
