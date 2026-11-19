import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import httpError from "../utils/httpError.js";

const PUBLIC_ROLES = new Set([
  "warehouseManager",
  "supplier",
  "salesRepresentative",
]);

function issueToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  return jwt.sign(
    { sub: String(user._id), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );
}

function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000,
  });
}

export async function register(req, res) {
  const { name, email, password, phone } = req.body;
  const requestedRole = req.body.role || "salesRepresentative";
  if (requestedRole === "admin") {
    throw httpError(403, "Public registration cannot create administrators");
  }
  if (!PUBLIC_ROLES.has(requestedRole)) throw httpError(400, "Invalid public role");
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    throw httpError(400, "Name, email, and a password of at least 8 characters are required");
  }

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    password,
    phone,
    role: requestedRole,
  });
  const token = issueToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ user: user.toJSON(), token });
}

export async function login(req, res) {
  const email = typeof req.body.email === "string" ? req.body.email.toLowerCase().trim() : "";
  const password = req.body.password;
  const user = await User.findOne({ email }).select("+password");
  if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.password))) {
    throw httpError(401, "Invalid email or password");
  }
  const token = issueToken(user);
  setAuthCookie(res, token);
  res.json({ user: user.toJSON(), token });
}

export function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ message: "Logged out" });
}

export function me(req, res) {
  res.json({ user: req.user.toJSON() });
}