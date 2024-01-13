const { userModel } = require("../../db/schemas/user/userSchema");
const { deletedUserModel } = require("../../db/schemas/user/deletedUserSchema");
const storage_client = require("../../cloud_storage/storage_client");
const { hashSync } = require("bcrypt");
const sharp = require("sharp");
const { userSocialsModel } = require("../../db/schemas/social/userSocials");
const mongoose = require("mongoose");
const updateQueryOptions = {
  runValidators: true,
  new: true,
};

const protectedFields = new Set(["password", "_id"]);
const getUser = async (req, res) => {
  const { userID } = req;
  try {
    //if fields not provided return the whole user document withouth the ID and password
    //NOT recommended unless intentional
    if (!req.query.fields) {
      const results = await userModel
        .find({ _id: userID }, { password: 0, _id: 0 })
        .lean();
      const document = results[0];
      res.json(document);
    } else {
      //get the requested fields without the user
      const queryConfig = {};
      // only fields in the query params will be included
      for (let index in req.query.fields) {
        let field = req.query.fields[index];
        if (field === "password") {
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
      if (req.query.fields.includes("profilePicture")) {
        userPhoto = getProfilePicture(userID);
      }
      // get profile picture if it was requested

      const [userDataResponse, userPhotoResponse] = await Promise.allSettled([
        userDataQuery,
        userPhoto,
      ]);
      const userDataJSON = userDataResponse.value;
      userDataJSON.profilePicture = userPhotoResponse.value;
      res.json(userDataJSON);
    }
  } catch (error) {
    res.status(500).send(error);
  }
};

const createNewUser = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction()
    req.body.password = hashSync(req.body.password, 10);
    const { firstName, lastName, email, password, dateOfBirth } = req.body;
    const newUser = await userModel.create(
      [{
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
      }],
      { session }
    );
    const newUserSocialsDoc = await userSocialsModel.create(
      [{
        userID: newUser[0]._id,
      }],
      { session }
    );
    res.status(201).send(newUser);
    await session.commitTransaction();
  } catch (error) {
    res.status(500).send(error);
    session && await session.abortTransaction();
  } finally {
    session && await session.endSession();
  }
};

const updateUserInfo = async (req, res) => {
  const { userID } = req;
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

const getProfilePicture = async (userID) => {
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

const uploadProfilePhoto = async (req, res) => {
  const { userID } = req;
  //parsed by multer middleware
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

const deleteUser = async (req, res) => {
  const { userID } = req;
  let session;
  try {
    session = await mongoose.startSession()
    session.startTransaction()
    const deletedUser = await userModel.findByIdAndDelete(userID, { session, lean: true });
    const newDeletedUser = await deletedUserModel.create([deletedUser], { session });

    await session.commitTransaction()
    res.send(newDeletedUser);
  } catch (e) {
    session && await session.abortTransaction()
    res.status(500).send(e);
  } finally {
    session && await session.endSession()
  }
};

module.exports = {
  createNewUser,
  getUser,
  deleteUser,
  updateUserInfo,
  uploadProfilePhoto,
  getProfilePicture,
  updateQueryOptions,
};
