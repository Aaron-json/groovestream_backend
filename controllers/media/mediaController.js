const {userModel} = require("../../db/schemas/user/userSchema");

const mediaTypeToFieldMap = {
  0: "audioFiles",
  1: "playlists",
};
const getMediaInfo = async (req, res) => {
  try {
    const {userID} = req;
    const {mediaType, mediaID} = req.params;
    const mediaField = mediaTypeToFieldMap[mediaType];
    const projectionString = mediaField + ".$";
    // programatically create the query projetion the nested subdocuments in the array
    const mediaFieldProjection = {};
    mediaFieldProjection[projectionString] = 1;

    // programatically create filter for user documents
    const queryFilter = {
      _id: userID,
    };
    queryFilter[mediaField] = {
      $elemMatch: {
        _id: mediaID,
      },
    };
    const query = await userModel.findOne(queryFilter, mediaFieldProjection);
    if (!query) {
      res.sendStatus(404);
    } else {
      res.json(query.playlists[0]);
    }
  } catch (err) {
    console.log(err);
    res.send(err);
  }
};
const uploadProfilePicture = async (req, res) => {
  const {userID} = req;
  const user = userModel.findById(userID, {profilePicture: 1});
};
module.exports = {
  getMediaInfo,
  mediaTypeToFieldMap
};
