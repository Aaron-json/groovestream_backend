declare global {
  namespace NodeJS {
    interface ProcessEnv {
      G00GLE_CLOUD_KEY_FILE: string;
      ACCESS_TOKEN_SECRET: string;
      REFRESH_TOKEN_SECRET: string;
      USER_DATA_BUCKET: string;
      GLOBAL_AUDIOFILES_BUCKET: string;
      PG_DATABASE_NAME: string;
      PG_USER: string;
      PG_PASSWORD: string;
      PG_HOST: string;
    }
  }
}

export { };
