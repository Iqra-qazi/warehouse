import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export default async function protect(req, res, next) {
  const authorization = req.headers.authorization;
  const bearerToken =
    typeof authorization === "string"
      ? /^Bearer\s+(\S+)$/i.exec(authorization.trim())?.[1]
      : undefined;
  const token = bearerToken || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || typeof payload === "string" || typeof payload.sub !== "string") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    next(error);
  }
}
