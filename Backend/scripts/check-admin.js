import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/user.model.js";

async function checkUsers() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Missing MONGO_URI");
    }

    await mongoose.connect(process.env.MONGO_URI);
    const [total, users] = await Promise.all([
      User.countDocuments(),
      User.find().select("email role").sort({ email: 1 }).lean(),
    ]);

    console.log(`Total users: ${total}`);
    for (const user of users) {
      console.log(`${user.email} | ${user.role}`);
    }
  } catch (error) {
    console.error(`Read-only user check failed: ${error.name || "Error"}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
