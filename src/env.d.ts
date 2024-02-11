declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "production" | undefined;
      DEV_DATABASE_URL: string;
      DEV_DATABASE_NAME: string;
      DELETED_USERS_COLLECTION: string;
      USER_AUTH_ID_MAP_COLLECTION: string;
      USERS_COLLECTION: string;
      G00GLE_CLOUD_KEY_FILE: string;
      GOOGLE_CLOUD_TEST_BUCKET: string;
      GOOGLE_CLOUD_PROJECT_ID: string;
      GOOGLE_CLOUD_DATABASE_BUCKET: string;
      ACCESS_TOKEN_SECRET: string;
      REFRESH_TOKEN_SECRET: string;
      MONGODB_USERNAME: string;
      MONGODB_PASSWORD: string;
      DATABASE_NAME: string;
      USER_DATA_BUCKET: string;
      GLOBAL_AUDIOFILES_BUCKET: string;
    }
  }
}
// export to convert it to a module and not a script
// modules must have at least one export
export {};
