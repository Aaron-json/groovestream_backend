import storage_client from "../../cloud_storage/storage_client.js";
import { hash } from "bcrypt";
import sharp from "sharp";
import { Request, Response } from "express";
import { AuthRequest } from "../auth/middleware.js";
import { Query, queryFn } from "../../db/connection/connect.js";
import { ProfilePicture, User } from "../../types/user.js";
import { ApiError } from "@google-cloud/storage";
export const updateQueryOptions = {
  runValidators: true,
  new: true,
};

export async function getUser(
  userId: number,
  userFields?: User
): Promise<User> {
  const query: Query = {
    queryStr: `
    SELECT * FROM "user"
    WHERE id = $1
    `,
    params: [userId],
  };
  const res = await queryFn(query);
  if (res.rowCount === 0) {
    throw new Error(`User not found`);
  }
  const user = res?.rows[0];
  return parseDbUser(user);
}

export const createNewUser = async (userInfo: any) => {
  const passwordHash = await hash(userInfo.params.password, 10);
  const queryCfg: Query = {
    queryStr: `
      INSERT INTO "user" (first_name, last_name, email, date_of_birth, password_hash)
      VALUES ($1, $2, $3, $4, $5);
      `,
    params: [
      userInfo.params.firstName,
      userInfo.params.lastName,
      userInfo.params.email,
      userInfo.params.dateOfBirth,
      passwordHash,
    ],
  };
  const response = await queryFn(queryCfg);
};

export const updateUserInfo = async (
  userID: number,
  updates: Omit<User, "id" | "dateJoined">
) => {};

export async function usernameExists(username: string) {
  const query: Query = {
    queryStr: `
    SELECT 1 FROM "user"
    WHERE
    username = $1
    `,
    params: [username],
  };
  const res = await queryFn(query);
  return res.rowCount > 0;
}
export const getProfilePicture = async (userID: number) => {
  try {
    const file = storage_client
      .bucket(process.env.USER_DATA_BUCKET)
      .file(`${userID}/profilePicture`);
    const dataRequest = await file.download();
    const response: ProfilePicture = {
      mimeType: "image/jpeg",
      encoding: "base64",
      data: dataRequest[0].toString("base64"),
    };
    return response;
  } catch (err) {
    // TODO: check the error from storage if it is a
    // 404
    if ((err as ApiError).code === 404) {
      return null;
    } else {
      throw err;
    }
  }
};

export const uploadProfilePhoto = async (
  userID: number,
  fileInfo: {
    buffer: Buffer;
    mimeType: string;
    size: number;
  }
) => {
  //parsed by multer middleware
  // profile photos are always stored as jpeg
  const compressedImage = await sharp(fileInfo.buffer)
    .resize(300, 300, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  const file = storage_client
    .bucket(process.env.USER_DATA_BUCKET)
    .file(`${userID}/profilePicture`);
  await file.save(compressedImage, {
    contentType: `image/jpeg`,
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { userID } = req as AuthRequest;
  try {
    res.sendStatus(500);
  } catch (e) {
    res.status(500).send(e);
  }
};

export function parseDbUser(dbUser: any) {
  const user: User = {
    id: dbUser.id,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    email: dbUser.email,
    dateJoined: dbUser.date_joined.toISOString(),
    dateOfBirth: dbUser.date_of_birth.toISOString(),
  };
  return user;
}
