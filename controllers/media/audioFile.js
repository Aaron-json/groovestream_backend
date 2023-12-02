const { streamSharedPlaylistAudioFileToStorage } = require("./sharedPlaylistAudioFile");

const storage_client = require("../../cloud_storage/storage_client");
const Busboy = require("busboy");
const { PassThrough } = require("stream");
const { userModel } = require("../../db/schemas/user/userSchema");
const uuid = require("uuid");
const { updateQueryOptions } = require("../user/userController");
const sharp = require("sharp");
const music_metadata = import("music-metadata");
const { saveSharedPlaylistAudioFileToDb } = require("./sharedPlaylistAudioFile");
const { savePlaylistAudioFileToDb } = require("./playlistAudioFile")
const { deleteAudioFileFromStorage } = require("./global");
const { streamUserAudioFileToStorage } = require("./global");

const uploadAudioFile = async (req, res) => {
    // memory efficient streaming instead of full upload to a buffer
    const { userID } = req;
    const { mediaType, playlistID } = req.params;
    // set up function scoped resources for the upload
    const busboy = Busboy({ headers: req.headers });
    let busboyFinished = false;
    let fileCounter = 0;
    const failedUploads = [];

    busboy.on("file", async (fieldname, file, { filename, encoding, mimeType }) => {
        fileCounter++;
        const newID = uuid.v4();
        const metadataStream = new PassThrough();
        const storageStream = new PassThrough();

        file.on("error", (e) => {
            metadataStream.destroy(e);
            storageStream.destroy(e);
        })
        file.on("end", () => {
            metadataStream.end()
            storageStream.end()
        })
        file.on("data", (chunk) => {
            metadataStream.write(chunk)
            storageStream.write(chunk);
        })
        // asynchronously parse metadata as the stream is incoming
        try {

            console.log("uploading file", filename)
            const storageUploadOptions = {
                contentType: mimeType
            }
            let dbSaveFunc;
            let storageStreamFunc;

            switch (mediaType) {
                case "0":
                    dbSaveFunc = async () => saveAudioFileToDb(userID, audioFile);
                    storageStreamFunc = async () => streamUserAudioFileToStorage(userID, newID, storageStream, storageUploadOptions);
                    break;
                case "2":
                    dbSaveFunc = async () => savePlaylistAudioFileToDb(userID, playlistID, audioFile);
                    storageStreamFunc = async () => streamUserAudioFileToStorage(userID, newID, storageStream, storageUploadOptions);
                    break;
                case "4":
                    dbSaveFunc = async () => saveSharedPlaylistAudioFileToDb(playlistID, audioFile, userID);
                    storageStreamFunc = async () => streamSharedPlaylistAudioFileToStorage(playlistID, newID, storageStream, storageUploadOptions);
                    break;
                default:
                    break;
            }
            const audioFileMetadata = parseAudioFileMetadata(metadataStream, {
                filename,
                encoding,
                mimeType,
                _id: newID,
            });

            const uploadToStoragePromise = storageStreamFunc();
            const [audioFile, uploadToStorageResponse] = await Promise.all([audioFileMetadata, uploadToStoragePromise])
            console.log("file is done uploading to storage");
            await dbSaveFunc();


        } catch (e) {
            // destroy the incoming file stream to avoid unclosed streams
            file.destroy(e);
            failedUploads.push({
                filename,
                error: e,
            })
            console.log(e)
        }
        // whether error happened or not, remove file from count
        // since it has been handled
        fileCounter--;

        if (busboyFinished && fileCounter === 0) {
            console.log("uploading the last file")
            // when uploading the last file
            if (failedUploads.length > 0) {
                res.status(500).json(failedUploads);
                console.log("sent response")
            } else {
                res.sendStatus(201);
            }
        }

    });

    busboy.on("finish", () => {
        // console.log(metadataStream.read());
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
const parseAudioFileMetadata = async (stream, fileInfo) => {

    const { filename, mimeType, _id } = fileInfo;
    const newAudioFile = { filename, _id };
    try {
        const parseStream = (await music_metadata).parseStream;
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
        console.log(newAudioFile);
    } catch (error) {
        console.log(error);
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
 * @param {Number} type - Type of the audioFile (can only be 0 or 2)
 * @param {String} userID - ID of the user document to update
 * @param {String} mediaID - ID of the media to delete
 */
const deleteAudioFileFromDb = async (
    type,
    userID,
    mediaID,
) => {
    // delete from root
    return userModel.updateOne(
        { _id: userID },
        {
            $pull: {
                audioFiles: {
                    _id: mediaID,
                },
            },
        },
        { updateQueryOptions }
    );
};

async function saveAudioFileToDb(userID, audioFile) {
    return userModel.updateOne(
        { _id: userID },
        {
            $push: {
                audioFiles: audioFile,
            },
        },
        updateQueryOptions
    );
}

const deleteAudioFile = async (req, res) => {
    const { userID } = req;
    const { audioFileID } = req.params;
    try {
        // delete file from cloud storage
        await deleteAudioFileFromStorage(userID, audioFileID);
    } catch (e) {
        console.log(e);
        return res.status(500).send(e);
    }
    // only if deleting file from storage was successful
    // delete it from storage

    try {
        // delete from root
        await deleteAudioFileFromDb(0, userID, audioFileID);

        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        res.send(error);
    }
};
const downloadUserAudioFile = async (req, res) => {
    // protected route so userID is in res object
    console.log("Doanloading audio");
    const { userID } = req;
    const { audioFileID } = req.params;
    try {
        const file = storage_client
            .bucket(process.env.USER_DATA_BUCKET)
            .file(`${userID}/${audioFileID}`);
        const metadataPromise = file.getMetadata();
        const audioFileDataPromise = file.download();
        const [metadata, audioFileData] = await Promise.all([metadataPromise, audioFileDataPromise]);
        const contentType = metadata[0].contentType;
        // res.setHeader("Content-Type", contentType);
        console.log(audioFileData);
        const base64EncodedAudio = audioFileData[0].toString("base64");
        console.log()
        res.send(base64EncodedAudio);
    } catch (err) {
        console.log(err)
        return res.status(500).send(err);
    }
};
const getAudioFileInfo = async (req, res) => {
    const { userID } = req;
    const { audioFileID } = req.params;
    try {

        const audioFIleInfoQuery = await userModel.find({
            _id: userID,
            "audioFiles._id": audioFileID
        }, {
            "audioFiles.$": 1
        })
        if (!audioFIleInfoQuery[0]) {
            return res.json({ message: "User or audioFile does not exist" })
        }
        res.json(audioFIleInfoQuery[0].audioFiles[0])
    } catch (error) {
        res.status(500).json(error)
    }
}
module.exports = {
    downloadUserAudioFile,
    uploadAudioFile,
    deleteAudioFile,
    deleteAudioFileFromStorage,
    getAudioFileInfo
};
