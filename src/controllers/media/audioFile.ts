import { streamSharedPlaylistAudioFileToStorage } from "./sharedPlaylistAudioFile.js";
import storage_client from "../../cloud_storage/storage_client.js";
import Busboy from "busboy";
import { PassThrough, Readable } from "stream";
import { userModel } from "../../db/schemas/user/userSchema.js";
import * as uuid from "uuid";
import { updateQueryOptions } from "../user/userController.js";
import sharp from "sharp";
import * as music_metadata from "music-metadata";
import { saveSharedPlaylistAudioFileToDb } from "./sharedPlaylistAudioFile.js";
import { savePlaylistAudioFileToDb } from "./playlistAudioFile.js";
import { deleteAudioFileStorage } from "./global.js";
import { streamUserAudioFileToStorage } from "./global.js";
import { Request, Response, Handler } from "express";
import { AuthRequest } from "../auth/middleware.js";
import { InferSchemaType } from "mongoose";
import { audioFileSchema } from "../../db/schemas/media/audioFile.js";
export const uploadAudioFile = async (req: Request, res: Response) => {
  // handles all audio file uploads
  const { userID } = req as AuthRequest;
  const { mediaType, playlistID } = req.params;
  // set up function scoped resources for the upload
  const busboy = Busboy({ headers: req.headers });
  let busboyFinished = false;
  let fileCounter = 0;
  const failedUploads: { filename: string; error: any }[] = [];

  busboy.on(
    "file",
    async (fieldname, file, { filename, encoding, mimeType }) => {
      fileCounter++;
      const newID = uuid.v4();
      const metadataStream = new PassThrough();
      const storageStream = new PassThrough();

      file.on("error", (e) => {
        metadataStream.destroy(e);
        storageStream.destroy(e);
      });
      file.on("end", () => {
        metadataStream.end();
        storageStream.end();
      });
      file.on("data", (chunk) => {
        metadataStream.write(chunk);
        storageStream.write(chunk);
      });
      // asynchronously parse metadata as the stream is incoming
      try {
        const storageUploadOptions = {
          contentType: mimeType,
        };
        let dbSaveFunc;
        let storageStreamFunc;

        switch (mediaType) {
          case "0":
            dbSaveFunc = async () => saveAudioFileDb(userID, audioFile);
            storageStreamFunc = async () =>
              streamUserAudioFileToStorage(
                userID,
                newID,
                storageStream,
                storageUploadOptions
              );
            break;
          case "2":
            dbSaveFunc = async () =>
              savePlaylistAudioFileToDb(userID, playlistID, audioFile);
            storageStreamFunc = async () =>
              streamUserAudioFileToStorage(
                userID,
                newID,
                storageStream,
                storageUploadOptions
              );
            break;
          case "4":
            dbSaveFunc = async () =>
              saveSharedPlaylistAudioFileToDb(playlistID, audioFile, userID);
            storageStreamFunc = async () =>
              streamSharedPlaylistAudioFileToStorage(
                playlistID,
                newID,
                storageStream,
                storageUploadOptions
              );
            break;
          default:
            throw new Error("Unknown media type");
        }
        const audioFileMetadata = parseAudioFileMetadata(metadataStream, {
          filename,
          encoding,
          mimeType,
          _id: newID,
        });

        const uploadToStoragePromise = storageStreamFunc();
        const [audioFile, uploadToStorageResponse] = await Promise.all([
          audioFileMetadata,
          uploadToStoragePromise,
        ]);
        await dbSaveFunc();
      } catch (e) {
        // destroy the incoming file stream to avoid unclosed streams
        file.destroy(e as Error);
        failedUploads.push({
          filename,
          error: e,
        });
      }
      // whether error happened or not, remove file from count
      // since it has been handled
      fileCounter--;

      if (busboyFinished && fileCounter === 0) {
        // when uploading the last file
        if (failedUploads.length > 0) {
          console.log(failedUploads);
          res.status(500).json(failedUploads);
        } else {
          res.sendStatus(201);
        }
      }
    }
  );

  busboy.on("finish", () => {
    busboyFinished = true;
  });
  req.pipe(busboy);
};

/**
 * Takes an incoming audioFile stream and parses its metadata. Created a new object that follows the AudioFileSchema
 * @param {Stream.Readable} stream - Incoming passthrough stream with the audio file data
 * @param {Object} fileInfo - Object containing information such as filename and mimeType
 * @returns {Object} - Object containing all the metadata in the shape defined by the AudioFile Schema
 * */
const parseAudioFileMetadata = async (
  stream: Readable,
  fileInfo: any
): Promise<InferSchemaType<typeof audioFileSchema>> => {
  const { filename, mimeType, _id } = fileInfo;
  const newAudioFile: any = {
    filename,
    _id,
  };
  try {
    const parseStream = music_metadata.parseStream;
    const metadata = await parseStream(stream, { mimeType });
    const { common, format } = metadata;

    newAudioFile.title = common?.title;
    newAudioFile.album = common?.album;
    newAudioFile.artists = common?.artists;
    newAudioFile.trackNumber = common.track
      ? `${common.track.no}/${common.track.of}`
      : null;
    newAudioFile.duration = format?.duration;
    newAudioFile.format = {
      container: format.container,
      codec: format.codec,
      mimeType: mimeType,
      sampleRate: format.sampleRate,
      bitrate: format.bitrate,
      channels: format.numberOfChannels,
    };
    if (common.picture) {
      const compressedIcon = await sharp(common.picture[0].data)
        .resize(150, 150, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();
      newAudioFile.icon = {
        mimeType: "image/jpeg",
        data: compressedIcon.toString("base64"),
      };
    }
  } catch (error) {
  } finally {
    return newAudioFile;
  }
};

/**
 * Delete audioFile from the database.
 * audioFile can only be of two types:
 * 0 - audioFile in the root.
 * 2 - audioFile in a playlist.
 * Throws error on failure.
 * @param {0 | 2} type - Type of the audioFile (can only be 0 or 2)
 * @param {String} userID - ID of the user document to update
 * @param {String} mediaID - ID of the media to delete
 */
export const deleteAudioFileDb = async (userID: string, mediaID: string) => {
  // delete from root
  const updateReponse = await userModel.updateOne(
    { _id: userID },
    {
      $pull: {
        audioFiles: {
          _id: mediaID,
        },
      },
    },
    updateQueryOptions
  );
  if (updateReponse.modifiedCount === 0) {
    throw new Error("Error deleting audiofile from database");
  }
};

export async function saveAudioFileDb(
  userID: string,
  audioFile: InferSchemaType<typeof audioFileSchema>
) {
  const updateResponse = await userModel.updateOne(
    { _id: userID },
    {
      $push: {
        audioFiles: audioFile,
      },
    },
    updateQueryOptions
  );
  if (updateResponse.modifiedCount === 0) {
    throw new Error("Error saving audiofile");
  }
}

export const deleteAudioFile = async (userID: string, audioFileID: string) => {
  await deleteAudioFileStorage(userID, audioFileID);
  // only if deleting file from storage was successful
  // delete it from db

  await deleteAudioFileDb(userID, audioFileID);
};
export const downloadAudioFile = async (req: Request, res: Response) => {
  // protected route so userID is in res object
  const { userID } = req as AuthRequest;
  const { mediaType, audioFileID, playlistID } = req.params;
  try {
    let bucket;
    let file;
    switch (mediaType) {
      case "0":
      case "2":
        bucket = process.env.USER_DATA_BUCKET;
        file = `${userID}/${audioFileID}`;
        break;
      case "4":
        bucket = process.env.GLOBAL_AUDIOFILES_BUCKET;
        file = `${playlistID}/${audioFileID}`;
        break;
      default:
        return res.status(400).send({ message: "Invalid media type" });
    }
    const response = await storage_client.bucket(bucket).file(file).download();
    res.send(response[0].toString("base64"));
    // pipeline will close streams on errors to prevent memory leaks
    // however we lose the ability to interact with res on errors
  } catch (err) {
    // do not attempt to write to response. It will be closed by the pipeline
    // on error and success
    console.log(err);
    return res.sendStatus(500);
  }
};
/**
 * @param {string} userID
 * @param {string} audioFileID
 * @returns Document with the audiofile metadata
 */
export async function getAudioFileInfo(userID: string, audioFileID: string) {
  const user = await userModel.findById(userID, {
    audioFiles: {
      $elemMatch: {
        _id: audioFileID,
      },
    },
  });
  if (!user) {
    throw new Error("User does not exist");
  }
  if (user.audioFiles.length === 0) {
    throw new Error("Audiofile does not exist");
  }
  return user.audioFiles[0];
}
