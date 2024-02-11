import { InferSchemaType } from "mongoose";
import { userModel } from "../../db/schemas/user/userSchema.js";
import { updateQueryOptions } from "../user/userController.js";
import { deleteAudioFileStorage } from "./global.js";
import { playlistAudioFileSchema } from "../../db/schemas/media/playlistAudioFile.js";
import { audioFileSchema } from "../../db/schemas/media/audioFile.js";
import storageClient from "../../cloud_storage/storage_client.js";

export async function getPlaylistAudioFileInfo(
  userID: string,
  audioFileID: string,
  playlistID: string
) {
  const playlistAudioFileInfoQuery = await userModel.findById(
    userID,
    {
      playlists: {
        $elemMatch: {
          _id: playlistID,
        },
      },
    },
    { lean: true }
  );
  // since we are getting the whole playlist use lean to reduce memory use
  if (!playlistAudioFileInfoQuery) {
    throw new Error("user does not exist");
  }
  if (playlistAudioFileInfoQuery.playlists.length === 0) {
    throw new Error("playlist does not exist");
  }
  const audioFile = playlistAudioFileInfoQuery.playlists[0].audioFiles.find(
    // mongoose has known typing issues when using inherited documents and timestamps
    (element: any) => element._id === audioFileID
  );
  if (!audioFile) {
    throw new Error("AudioFile does not exist");
  }
  return audioFile;
}
export const deletePlaylistAudioFile = async (
  userID: string,
  audioFileID: string,
  playlistID: string
) => {
  // do not do them in parrel to ensure data integrity.
  // Google storage does not have transactions.
  await deleteAudioFileStorage(userID, audioFileID);
  await deletePlaylistAudioFileDb(userID, playlistID, audioFileID);
};

export async function savePlaylistAudioFileToDb(
  userID: string,
  playlistID: string,
  audioFile: InferSchemaType<typeof audioFileSchema>
) {
  // the audio file is in the audioFile schema which means it lacks some of the extended
  // fields that are defined in the sharedPlaylstAudioFileSchema so we have to add them here.
  (
    audioFile as unknown as InferSchemaType<typeof playlistAudioFileSchema>
  ).playlistID = playlistID;
  const updateResponse = await userModel.updateOne(
    {
      _id: userID,
      "playlists._id": playlistID,
    },
    {
      $push: {
        "playlists.$.audioFiles": audioFile,
      },
    },
    {
      ...updateQueryOptions,
    }
  );
  if (updateResponse.modifiedCount === 0) {
    throw new Error("Error saving audiofile to playlist");
  }
}

export async function deletePlaylistAudioFileDb(
  userID: string,
  playlistID: string,
  audioFileID: string
) {
  const updateResponse = await userModel.updateOne(
    {
      _id: userID,
      playlists: {
        $elemMatch: {
          _id: playlistID,
        },
      },
    },
    {
      $pull: {
        "playlists.$.audioFiles": {
          _id: audioFileID,
        },
      },
    },
    updateQueryOptions
  );
  if (updateResponse.modifiedCount === 0) {
    throw new Error("Could not remove playlist");
  }
}

/**
 * Due to a previous known bug, it was possible to delete a playlist audiofile from storage
 * but not from the database. This functions checks all user audio files in the database and deletes
 * those that are not in storage.
 * @param {string} userID
 */
export async function cleanPlaylistAudioFile(userID: string) {
  try {
    const user = await userModel.findById(
      userID,
      {
        "playlists._id": 1,
        "playlists.audioFiles": 1,
        "playlists.name": 1,
      },
      { lean: true }
    );
    if (!user) {
      return;
    }
    for (const playlist of user.playlists) {
      for (const audioFile of playlist.audioFiles) {
        const exists = await storageClient
          .bucket(process.env.USER_DATA_BUCKET)
          .file(`${userID}/${audioFile._id}`)
          .exists();
        if (!exists[0]) {
          await deletePlaylistAudioFileDb(
            userID,
            playlist._id,
            audioFile._id as unknown as string
          );
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}
