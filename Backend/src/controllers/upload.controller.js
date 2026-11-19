import { deleteImage, uploadImage, verifyImage } from "../../services/storage.service.js";
import { getImageKitClient, getImageKitSettings } from "../config/imagekit.js";
import httpError from "../utils/httpError.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function matchesImageSignature(buffer, mimetype) {
  if (mimetype === "image/jpeg") {
    return buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }
  if (mimetype === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimetype === "image/webp") {
    return buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

export function getUploadAuth(req, res) {
  const { publicKey, urlEndpoint } = getImageKitSettings();
  res.set("Cache-Control", "no-store");
  res.json({
    ...getImageKitClient().helper.getAuthenticationParameters(),
    publicKey,
    urlEndpoint,
  });
}

export async function upload(req, res) {
  if (!req.file || !allowedTypes.has(req.file.mimetype) ||
      !matchesImageSignature(req.file.buffer, req.file.mimetype)) {
    throw httpError(400, "Only JPEG, PNG, and WebP images are accepted");
  }
  const extension = req.file.mimetype === "image/jpeg" ? "jpg" : req.file.mimetype.split("/")[1];
  const uploaded = await uploadImage(
    req.file.buffer,
    `image-${Date.now()}.${extension}`,
    "inventory"
  );
  try {
    const verified = await verifyImage(uploaded.fileId, uploaded.url);
    res.status(201).json(verified);
  } catch (error) {
    await deleteImage(uploaded.fileId);
    throw error;
  }
}

