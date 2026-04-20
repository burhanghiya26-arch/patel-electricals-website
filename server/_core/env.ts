export const ENV = {
  appId: process.env.VITE_APP_ID ?? "default-app-id",
  cookieSecret: process.env.JWT_SECRET ?? "default-jwt-secret-key-change-in-production",
  JWT_SECRET: process.env.JWT_SECRET ?? "default-jwt-secret-key-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "https://api.manus.im",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "default-key",
};
