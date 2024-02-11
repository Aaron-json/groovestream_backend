import { userModel } from "../../db/schemas/user/userSchema.js";
import storage_client from "../../cloud_storage/storage_client.js";
import { pipeline as pipeline_async } from "node:stream/promises";
import {
  sharedPlaylistAudioFileSchema,
  sharedPlaylistModel,
} from "../../db/schemas/media/sharedPlaylist.js";
import { Readable } from "node:stream";
import mongoose, { InferSchemaType } from "mongoose";
import { Request, Response } from "express";
import { AuthRequest } from "../auth/middleware.js";
import { audioFileSchema } from "../../db/schemas/media/audioFile.js";
import { playlistAudioFileSchema } from "../../db/schemas/media/playlistAudioFile.js";

export async function getSharedPlaylistAudioFileInfo(
  req: Request,
  res: Response
) {
  const { userID } = req as AuthRequest;
  const { playlistID, audioFileID } = req.params;
  const sharedPlaylistAudioFileQuery = await userModel
    .find(
      { _id: userID },
      {
        sharedPlaylists: 1,
      }
    )
    .populate("sharedPlaylists", {
      audioFiles: 1,
    });
}

export async function streamSharedPlaylistAudioFileToStorage(
  playlistID: string,
  audioFileID: string,
  audioStream: Readable,
  options: any
) {
  const writeStream = storage_client
    .bucket(process.env.GLOBAL_AUDIOFILES_BUCKET)
    .file(`${playlistID}/${audioFileID}`)
    .createWriteStream({
      contentType: options.contentType,
    });
  await pipeline_async(audioStream, writeStream);
}

export async function saveSharedPlaylistAudioFileToDb(
  playlistID: string,
  audioFile: InferSchemaType<typeof audioFileSchema>,
  userID: string
) {
  // the audio file is in the audioFile schema which means it lacks some of the extended
  // fields that are defined in the sharedPlaylstAudioFileSchema so we have to add them here.
  (
    audioFile as unknown as InferSchemaType<
      typeof sharedPlaylistAudioFileSchema
    >
  ).playlistID = playlistID;
  // there is a known issue with types when using mongoose timestamps. use any type sparingly
  (audioFile as any).uploadedBy = {
    memberID: userID,
  };
  const updateResponse = await sharedPlaylistModel.updateOne(
    {
      _id: playlistID,
    },
    {
      $push: {
        audioFiles: audioFile,
      },
    }
  );
  if (updateResponse.modifiedCount === 0) {
    throw new Error("Error saving audiofile to playlist");
  }
}

export async function deleteSharedPlaylistAudioFile(
  userID: string,
  audioFileID: string,
  playlistID: string
) {
  // TODO: Add member / owner checks for added authentication
  await deleteSharedPlaylistAudioFileStorage(playlistID, audioFileID);
  await deleteSharedPlaylistAudioFileDb(playlistID, audioFileID);
}

export async function deleteSharedPlaylistAudioFileDb(
  playlistID: string,
  audioFileID: string,
  session?: mongoose.mongo.ClientSession
) {
  const updateReponse = await sharedPlaylistModel.updateOne(
    {
      _id: playlistID,
    },
    {
      $pull: {
        audioFiles: {
          _id: audioFileID,
        },
      },
    },
    { session }
  );

  if (updateReponse.modifiedCount === 0) {
    throw new Error("Error deleting audio file from playlist");
  }
}

export async function deleteSharedPlaylistAudioFileStorage(
  playlistID: string,
  audioFileID: string
) {
  return storage_client
    .bucket(process.env.GLOBAL_AUDIOFILES_BUCKET)
    .file(`${playlistID}/${audioFileID}`)
    .delete();
}

export async function deleteSharedPlaylistAudioFileHelper(
  playlistID: string,
  audioFileID: string,
  session: mongoose.mongo.ClientSession
) {
  /*
    Helper function to do deleting from storage and from database as one function.
    Convenience if needed ot export this functionality.
    Internal functions can call the two functions independently if preferred.
  */
  await deleteSharedPlaylistAudioFileStorage(playlistID, audioFileID);
  await deleteSharedPlaylistAudioFileDb(playlistID, audioFileID, session);
}
