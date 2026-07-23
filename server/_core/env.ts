export const ENV = {
  appId: process.env.VITE_APP_ID ?? "default-app-id",
  cookieSecret:
    process.env.JWT_SECRET ??
    "default-jwt-secret-key-change-in-production",

  JWT_SECRET:
    process.env.JWT_SECRET ??
    "default-jwt-secret-key-change-in-production",

  databaseUrl: process.env.DATABASE_URL ?? "",

  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",

  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  isProduction: process.env.NODE_ENV === "production",

  // Old Forge (keep for compatibility)
  forgeApiUrl:
    process.env.BUILT_IN_FORGE_API_URL ??
    "https://api.manus.im",

  forgeApiKey:
    process.env.BUILT_IN_FORGE_API_KEY ??
    "default-key",

  // ----------- R2 / S3 -----------
  s3Endpoint: process.env.S3_ENDPOINT ?? "",

  s3Region: process.env.S3_REGION ?? "auto",

  s3Bucket: process.env.S3_BUCKET ?? "",

  s3AccessKey: process.env.S3_ACCESS_KEY_ID ?? "",

  s3SecretKey: process.env.S3_SECRET_ACCESS_KEY ?? "",

  publicR2Url: process.env.PUBLIC_R2_URL ?? "",
};
