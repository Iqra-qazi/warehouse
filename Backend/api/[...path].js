import mongoose from "mongoose";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";

let connectionPromise;

async function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  await connectionPromise;
}

export default async function handler(req, res) {
  const requestPath = req.url?.split("?")[0];
  if (req.method !== "OPTIONS" && requestPath !== "/" && requestPath !== "/api/health") {
    await ensureDatabaseConnection();
  }

  return app(req, res);
}
