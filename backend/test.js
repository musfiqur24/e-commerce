const { resolve } = require("path");
require("dotenv").config();
const { bootstrapApp } = require("@medusajs/framework");

async function main() {
  const { app, container } = await bootstrapApp({
    configModule: require("./medusa-config"),
    projectConfig: {
      databaseUrl: process.env.DATABASE_URL,
      http: { jwtSecret: "test", cookieSecret: "test" }
    },
    loaders: []
  });

  try {
    const doctorPortalService = container.resolve("doctorPortal");
    await doctorPortalService.listDoctorUsers({});
  } catch (err) {
    console.error("CAUGHT ERROR:", err.stack);
  }
  process.exit(0);
}
main();
