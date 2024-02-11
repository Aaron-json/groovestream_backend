import { userModel } from "../../db/schemas/user/userSchema.js";
import { deletedUserModel } from "../../db/schemas/user/deletedUserSchema.js";
import storage_client from "../../cloud_storage/storage_client.js";
import { hashSync } from "bcrypt";
import sharp from "sharp";
import { userSocialsModel } from "../../db/schemas/social/userSocials.js";
import mongoose from "mongoose";
import { Request, Response } from "express";
import { AuthRequest } from "../auth/middleware.js";
import { deletePlaylist } from "../media/playlist.js";
import { deleteAudioFile } from "../media/audioFile.js";
export const updateQueryOptions = {
  runValidators: true,
  new: true,
};

const protectedFields = new Set(["password", "_id"]);
export const getUser = async (req: Request, res: Response) => {
  const { userID } = req as AuthRequest;
  try {
    //if fields not provided return the whole user document withouth the ID and password
    //NOT recommended unless intentional
    if (!req.query.fields) {
      const user = await userModel
        .findById(userID, { password: 0, _id: 0 })
        .lean();
      return res.json(user);
    }
    //get the requested fields without the user
    const queryConfig: any = {};
    // only fields in the query params will be included
    for (let field of req.query.fields as string[]) {
      if (protectedFields.has(field)) {
        continue;
      }
      queryConfig[field] = 1;
    }
    queryConfig._id = 0;
    // use lean since this is read only and i do not need
    // a hydrated bson document only the json
    // lets us apply getters for the fields instead of having to read them from
    // the bson document
    const userDataQuery = userModel.findById(userID, queryConfig).lean();

    let userPhoto;
    if (
      (req.query.fields as string[] | undefined)?.includes("profilePicture")
    ) {
      userPhoto = getProfilePicture(userID);
    }
    // get profile picture if it was requested

    const [userDataResponse, userPhotoResponse] = await Promise.allSettled([
      userDataQuery,
      userPhoto,
    ]);
    if (userDataResponse.status === "rejected") {
      return res.status(500).send("Error finding user");
    }
    if (userDataResponse.value === null) {
      return res.status(400).send("Could not find user");
    }
    const userDataJSON = userDataResponse.value;

    (userDataJSON as any).profilePicture =
      userPhotoResponse.status === "rejected" ? null : userPhotoResponse.value;
    res.json(userDataJSON);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const createNewUser = async (req: Request, res: Response) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    req.body.password = hashSync(req.body.password, 10);
    const { firstName, lastName, email, password, dateOfBirth } = req.body;
    const newUser = await userModel.create(
      [
        {
          firstName,
          lastName,
          email,
          password,
          dateOfBirth,
          playlists: [
            {
              name: "Favorites",
            },
          ],
        },
      ],
      { session }
    );
    const newUserSocialsDoc = await userSocialsModel.create(
      [
        {
          userID: newUser[0]._id,
        },
      ],
      { session }
    );
    res.status(201).send(newUser);
    await session.commitTransaction();
  } catch (error) {
    res.status(500).send(error);
    session && (await session.abortTransaction());
  } finally {
    session && (await session.endSession());
  }
};

export const updateUserInfo = async (req: Request, res: Response) => {
  const { userID } = req as AuthRequest;
  const { fields } = req.body;
  try {
    await userModel.updateOne(
      { _id: userID },
      {
        $set: fields,
      },
      updateQueryOptions
    );
    res.sendStatus(200);
  } catch (error) {
    res.send(error);
  }
};

export const getProfilePicture = async (userID: string) => {
  try {
    const file = storage_client
      .bucket(process.env.USER_DATA_BUCKET)
      .file(`${userID}/profilePicture`);
    const dataRequest = await file.download();
    const response = {
      mimeType: "image/jpeg",
      encoding: "base64",
      data: dataRequest[0].toString("base64"),
    };
    return response;
  } catch (e) {
    return null;
  }
};

export const uploadProfilePhoto = async (req: Request, res: Response) => {
  const { userID } = req as AuthRequest;
  //parsed by multer middleware
  if (!req.file) {
    return res.sendStatus(500);
  }
  const { originalname, encoding, mimetype, buffer, size } = req.file;

  try {
    const compressedImage = await sharp(buffer)
      .resize(300, 300, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer();
    const file = storage_client
      .bucket(process.env.USER_DATA_BUCKET)
      .file(`${userID}/profilePicture`);
    await file.save(compressedImage, {
      contentType: `image/jpeg`,
    });
    res.sendStatus(201);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { userID } = req as AuthRequest;
  try {
    await _deleteUser(userID);
    res.sendStatus(200);
  } catch (e) {
    res.status(500).send(e);
  }
};

async function _deleteUser(userID: string) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const user = await userModel.findById(userID, {
      playlists: 1,
      sharedPlaylists1: 1,
      audioFiles: 1,
    });
    if (!user) {
      throw new Error(`User not found`);
    }

    await userModel.findByIdAndDelete(userID, { session });
    await userSocialsModel.findOneAndDelete({ userID: userID }, { session });
    await session.commitTransaction();
  } catch (error) {
    // catch the error so we can cleanly exist the session but
    // throw it again so the caller is notified
    session && (await session.abortTransaction());
    throw error;
  } finally {
    session && (await session.endSession());
  }
}
