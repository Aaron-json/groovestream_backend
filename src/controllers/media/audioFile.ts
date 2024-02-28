import storage_client, {
  storageClient,
} from "../../cloud_storage/storage_client.js";
import Busboy from "busboy";
import { PassThrough, Readable } from "stream";
import * as uuid from "uuid";
import sharp from "sharp";
import * as mm from "music-metadata";
import { Request, Response } from "express";
import { AuthRequest } from "../auth/middleware.js";
import { Query, queryFn } from "../../db/connection/connect.js";
import { AudioFile, MediaType } from "../../types/media.js";
import { pipeline as pipeline_async } from "stream/promises";

export const uploadAudioFile = async (
  req: Request,
  res: Response,
  mediaType: MediaType
) => {
  // handles all audio file uploads
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

        const audioFileMetadata = parseStreamAudioFile(
          metadataStream,
          (req as AuthRequest).userID,
          {
            filename,
            mimeType,
            storageId: newID,
            type: mediaType,
            playlistId: req.params.playlistID
              ? +req.params.playlistID
              : undefined,
          }
        );

        const uploadToStoragePromise = streamAudioFileToStorage(
          newID,
          storageStream,
          storageUploadOptions
        );
        const [audioFile, uploadToStorageResponse] = await Promise.all([
          audioFileMetadata,
          uploadToStoragePromise,
        ]);
        await saveAudioFileDb(audioFile);
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
          return failedUploads;
        } else {
          return;
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
 * Takes an incoming audioFile stream and parses its metadata. Created a new object that follows
 * the @AudioFile interface.
 * @param stream  Incoming passthrough stream with the audio file data
 * @param fileInfo  Object containing information such as filename and mimeType
 * @returns Object containing all the metadata in the shape defined by the AudioFile Schema
 * */
async function parseStreamAudioFile(
  stream: Readable,
  userID: number,
  fileInfo: {
    filename: string;
    mimeType: string;
    storageId: string;
    type: number;
    playlistId: number | undefined;
  }
) {
  const { filename, mimeType, storageId, type, playlistId } = fileInfo;
  const newAudioFile: Omit<AudioFile, "id" | "uploadedAt"> = {
    filename,
    storageId,
    type,
    uploadedBy: userID,
    playlistId,
    format: {
      mimeType,
    },
  };
  try {
    // all the required fields are already set, error will cause to return what has been parsed
    // up to that point
    const metadata = await mm.parseStream(
      stream,
      { mimeType },
      { duration: true }
    );
    const { common, format } = metadata;

    newAudioFile.title = common?.title;
    newAudioFile.album = common?.album;
    newAudioFile.artists = common?.artists;
    newAudioFile.trackNumber = common.track.no;
    newAudioFile.trackTotal = common.track.of;
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
        data: compressedIcon,
      };
    }
  } catch (error) {
  } finally {
    return newAudioFile;
  }
}

export const deleteAudioFileDb = async (audioFileID: number) => {
  const query: Query = {
    queryStr: `DELETE FROM "audiofile"
    WHERE id = $1;
    `,
    params: [audioFileID],
  };
  const response = await queryFn(query);
};
/**
 *
 * @param userID
 * @param audioFile Values with a default value in the database are ommited from the type
 */
export async function saveAudioFileDb(
  audioFile: Omit<AudioFile, "id" | "uploadedAt">
) {
  const query: Query = {
    queryStr: `INSERT INTO "audiofile" (filename, type, storage_id, title, uploaded_by,
      duration, playlist_id, album, artists, genre, mime_type, sample_rate, track_number,
      container, codec, channels, bitrate, icon, icon_mime_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);
    `,
    params: [
      audioFile.filename,
      audioFile.type,
      audioFile.storageId,
      audioFile.title,
      audioFile.uploadedBy,
      audioFile.duration,
      audioFile.playlistId,
      audioFile.album,
      audioFile.artists,
      audioFile.genre,
      audioFile.format.mimeType,
      audioFile.format.sampleRate,
      audioFile.trackNumber,
      audioFile.format.container,
      audioFile.format.codec,
      audioFile.format.channels,
      audioFile.format.bitrate,
      audioFile.icon?.data,
      audioFile.icon?.mimeType,
    ],
  };
  const res = await queryFn(query);
}

export const deleteAudioFile = async (
  audioFileID: number,
  storageID: string
) => {
  await deleteAudioFileStorage(storageID);
  // only if deleting file from storage was successful
  // delete it from db
  await deleteAudioFileDb(audioFileID);
};
export const downloadAudioFile = async (req: Request, res: Response) => {
  const { storageID } = req.params;
  try {
    const response = await storage_client
      .bucket(process.env.GLOBAL_AUDIOFILES_BUCKET)
      .file(storageID)
      .download();
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
 * Returns an audiofile's metadata in the appropriate shape to be sent
 * to the user directly.
 */
export async function getAudioFileInfo(
  audioFileID: number
): Promise<AudioFile> {
  const query: Query = {
    queryStr: `SELECT audiofile.*,
    uploader.first_name AS uploaded_by_first_name,
    uploader.last_name AS uploaded_by_last_name
    FROM audiofile
    JOIN "user" uploader ON audiofile.uploaded_by = uploader.id
    WHERE "audiofile.id" = $1;`,
    params: [audioFileID],
  };
  const res = await queryFn(query);
  const dbAudioFile = res?.rows[0];
  return parseDbAudioFile(dbAudioFile);
}
/**
 * Takes an object containing rows from the audiofile table
 * and parses it into its the appropriate shape.
 * Expects field referencing the uploader to be populated with the following column names:
 * uploaded_by_first_name, uploaded_by_last_name,
 * @param dbAudioFile Object from the audiofile table in the database
 * @returns
 */
export function parseDbAudioFile(dbAudioFile: any) {
  const audioFile: AudioFile = {
    id: dbAudioFile.id,
    filename: dbAudioFile.filename,
    storageId: dbAudioFile.storage_id,
    album: dbAudioFile.album,
    title: dbAudioFile.title,
    artists: dbAudioFile.artists,
    playlistId: dbAudioFile.playlist_id,
    genre: dbAudioFile.genre,
    duration: dbAudioFile.duration,
    trackNumber: dbAudioFile.track_number,
    trackTotal: dbAudioFile.track_total,
    type: dbAudioFile.type,
    uploadedBy: {
      id: dbAudioFile.uploaded_by,
      firstName: dbAudioFile.uploaded_by_first_name,
      lastName: dbAudioFile.uploaded_by_last_name,
    },
    uploadedAt: dbAudioFile.uploaded_at.toISOString(),
    format: {
      bitrate: dbAudioFile.bitrate,
      channels: dbAudioFile.channels,
      sampleRate: dbAudioFile.sample_rate,
      mimeType: dbAudioFile.mime_type,
      container: dbAudioFile.container,
      codec: dbAudioFile.codec,
    },
    icon: dbAudioFile.icon
      ? {
          data: dbAudioFile.icon.toString("base64"),
          mimeType: dbAudioFile.icon_mime_type,
        }
      : undefined,
  };
  return audioFile;
}
export async function streamAudioFileToStorage(
  fileID: string,
  readableStream: Readable,
  options: any
) {
  const storageWriteStream = storageClient
    .bucket(process.env.GLOBAL_AUDIOFILES_BUCKET)
    .file(fileID)
    .createWriteStream({
      contentType: options.contentType,
    });
  await pipeline_async(readableStream, storageWriteStream);
}
/**
 * Delete an audioFile object from storage. This action is non-reversible.
 * Throws an error on failure
 * @param audioFileId name of the file to delete, which is typically the ID of the file
 */
export async function deleteAudioFileStorage(audioFileId: string) {
  // this method is for both playlist and non playlist audiofiles
  // since they are stored in the same path in storage
  return storageClient
    .bucket(process.env.GLOBAL_AUDIOFILES_BUCKET)
    .file(audioFileId)
    .delete();
}
