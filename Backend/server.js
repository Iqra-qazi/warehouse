import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const [{ default: mongoose }, { default: app }, { default: connectDB }] = await Promise.all([
  import("mongoose"),
  import("./src/app.js"),
  import("./src/config/db.js"),
]);

async function startServer() {
  const missing = ["MONGO_URI", "JWT_SECRET"].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  await connectDB();

  const port = Number(process.env.PORT || 5000);
  await new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
      resolve(server);
    });
    server.once("error", reject);
  });
}

startServer().catch(async (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${process.env.PORT || 5000} is already in use. Set PORT to another available port.`
    );
  }
  const message = String(error.message || "").replace(
    /mongodb(?:\+srv)?:\/\/[^\s@]+@/gi,
    "mongodb://[redacted]@"
  );
  console.error("Failed to start backend:", error.name || "Error", message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
