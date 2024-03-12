export interface User {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: string;
  dateJoined: string;
}

// this data that people can be sent back to the client without the party
// sending the request being a friend to the user. The rest can only be seen
// if the users are freinds or through other elevated persmissions added later
// NOTE: the id is useful in making requests
export interface PublicUserInfo extends Pick<User, "id" | "username"> {}

export interface ProfilePicture {
  mimeType: string;
  encoding: string;
  data: string;
}
