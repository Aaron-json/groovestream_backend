const { userModel } = require("../db/schemas/userSchema");
const { deletedUserModel } = require("../db/schemas/deletedUserSchema");
const storage_client = require("../cloud_storage/storage_client");
const { hashSync, compareSync } = require("bcrypt");
const {
  createAccessToken,
  createRefreshToken,
  refreshTokenCookieOptions,
} = require("../auth/userAuthentication");

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
      const results = await userModel.find(
        { _id: userID },
        { password: 0, _id: 0 }
      );
      const document = results[0];
      res.json(document);
    } else {
      //get the requested fields without the user
      const queryConfig = {};
      // only fields in the query params will be included
      for (let index in req.query.fields) {
        let field = req.query.fields[index];
        if (field == "password") {
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
    console.log(error);
    res.status(500).send(error);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const user = await userModel.find();
    res.json(user);
  } catch (e) {
    res.status(500).send(e);
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body; // get password and email from request
    const query = await userModel.find({ email }, { password: 1 });
    if (query.length === 0) {
      throw new Error(`User with email: "${email}" does not exist`);
    } else if (query.length > 1) {
      throw new Error(`Multiple users with email: "${email}" found`);
    }
    const user = query[0];
    const validLogin = compareSync(password, user.password);
    if (!validLogin) {
      return res.sendStatus(401);
    }
    delete user.password; // do not send password back to user. remove after verification
    const accessToken = createAccessToken(user._id.toString());
    const refreshToken = createRefreshToken(user._id.toString());
    // send access token in json and the refresh token as a httpOnly cookie
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
    res.json({ accessToken });
    console.log("successful login");
  } catch (e) {
    res.status(401).send(e);
    console.log(e);
  }
};

const logout = async (req, res) => {
  // browsers will only clear cookie if the name and options we pass in match ones of the
  // cookie we are trying to delete
  res.clearCookie("refreshToken", refreshTokenCookieOptions);
  res.sendStatus(200);
};
const createNewUser = async (req, res) => {
  try {
    req.body.password = hashSync(req.body.password, 10);
    const { firstName, lastName, email, password, dateOfBirth } = req.body;
    const newUser = await userModel.create({
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
    });
    // user id is guaranteed to be unique by mongodb so every bucket will also be unique
    await storage_client.createBucket(newUser._id.toString());
    res.send(newUser);
  } catch (error) {
    console.log(error.message);
    res.status(500).send(error);
  }
};

const updateUserInfo = async (req, res) => {
  const { userID } = req;
  const { fields } = req.body;
  console.log(fields);
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
    console.log(error);
    res.send(error);
  }
};

const getProfilePicture = async (userID) => {
  const file = storage_client.bucket(userID).file("profilePicture");
  const metadataRequest = file.getMetadata();
  const dataRequest = file.download();
  //convert picture to base 64 string and return it
  const [dataResponse, metadataResponse] = await Promise.allSettled([
    dataRequest,
    metadataRequest,
  ]);
  if (
    dataResponse.status === "rejected" ||
    metadataResponse.status === "rejected"
  ) {
    return null;
  }
  const profilePictureObject = {
    data: dataResponse.value[0].toString("base64"),
    mimeType: metadataResponse.value[0].contentType,
  };
  return profilePictureObject;
};

const uploadProfilePhoto = async (req, res) => {
  const { userID } = req;
  //parsed by multer middleware
  const { originalname, encoding, mimetype, buffer, size } = req.file;

  try {
    const file = storage_client.bucket(userID).file("profilePicture");
    await file.save(buffer, {
      contentType: mimetype,
    });
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const deletedUser = await userModel.findByIdAndDelete(req.userID);
    const newDeletedUser = await deletedUserModel.create({
      _id: deletedUser._id,
      user: deletedUser,
    });
    // do not delete bucket
    // user info is moved to deleted users db.
    // check which db user is in to know if they are deleted
    res.send(newDeletedUser);
  } catch (e) {
    res.status(500).send(e);
  }
};

const deleteAllUsers = async (req, res) => {
  try {
    const deletedUsers = await userModel.deleteMany();
    res.send(deletedUsers);
  } catch (e) {
    res.status(500).send(e);
  }
};
// fix this method
const getRecentSearches = async (req, res) => {
  // order not implemented yet
  try {
    const { userID } = req;
    const { limit } = req.query;

    // find and findAndModify methods have restrictions
    // see: MongoDB documentation
    const user = await userModel.findById(userID, {
      recentSearches: { $slice: Number(limit) },
      _id: 0,
      // dummy inclusion projection to exclude other fields
      _NOT_A_REAL_FIELD: 1,
    });
    res.status(200).json(user.recentSearches);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

const addRecentSearch = async (req, res) => {
  const { userID } = req;
  const { mediaID, mediaType } = req.body;
  try {
    // try to remove the object from history if it exists
    await userModel.findOneAndUpdate(
      { _id: userID },
      {
        $pull: {
          recentSearches: {
            mediaID,
            mediaType,
          },
        },
      },
      updateQueryOptions
    );
    await userModel.findOneAndUpdate(
      { _id: userID },
      {
        $push: {
          recentSearches: {
            mediaID,
            mediaType,
          },
        },
      },
      updateQueryOptions
    );
    res.sendStatus(201);
  } catch (error) {
    res.status(500).json(error);
  }
};
// implement this method
const deleteRecentSearch = async (req, res) => {
  const { userID } = req;
  const { mediaID, mediaType } = req.query;
  try {
    await userModel.findOneAndUpdate(
      { _id: userID },
      {
        $pull: {
          recentSearches: {
            mediaID,
            mediaType,
          },
        },
      },
      updateQueryOptions
    );
  } catch (e) {}
};

const getUserParam = async (req, res) => {
  /**
   * NOT IMPLEMENTED
   */
  try {
    const user = await userModel.findById(req.userID);
  } catch (error) {}
};

module.exports = {
  createNewUser,
  getUser,
  getAllUsers,
  deleteUser,
  deleteAllUsers,
  login,
  logout,
  getUserParam,
  getRecentSearches,
  addRecentSearch,
  deleteRecentSearch,
  updateUserInfo,
  uploadProfilePhoto,
  updateQueryOptions,
};
