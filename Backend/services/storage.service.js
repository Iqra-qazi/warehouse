import ImageKit from "@imagekit/nodejs";
import { getImageKitClient, getImageKitSettings } from "../src/config/imagekit.js";
import httpError from "../src/utils/httpError.js";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadImage(buffer, fileName, folder) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw httpError(400, "Image must be non-empty and no larger than 2 MB");
  }

  const file = await ImageKit.toFile(buffer, fileName);
  const uploaded = await getImageKitClient().files.upload({ file, fileName, folder });
  if (!uploaded.fileId || !uploaded.url) {
    throw httpError(502, "ImageKit did not return an image URL and file ID");
  }
  return { url: uploaded.url, fileId: uploaded.fileId };
}

export async function deleteImage(fileId) {
  if (fileId) {
    await getImageKitClient().files.delete(fileId);
  }
}

export async function verifyImage(fileId, url) {
  if (typeof fileId !== "string" || !fileId || typeof url !== "string" || !url) {
    throw httpError(400, "Both image URL and ImageKit file ID are required");
  }

  const { urlEndpoint } = getImageKitSettings();
  const file = await getImageKitClient().files.get(fileId);
  if (!file.url) {
    throw httpError(400, "ImageKit file has no URL");
  }
  let endpoint;
  let actualUrl;
  try {
    endpoint = new URL(urlEndpoint);
    actualUrl = new URL(file.url);
  } catch {
    throw httpError(400, "ImageKit returned an invalid file URL");
  }
  let suppliedUrl;
  try {
    suppliedUrl = new URL(url);
  } catch {
    throw httpError(400, "Invalid image URL");
  }
  const format = (file.filePath?.split(".").pop() || "").toLowerCase();
  const endpointPath = endpoint.pathname.replace(/\/+$/, "");
  const matchesEndpoint = (imageUrl) =>
    imageUrl.protocol === "https:" &&
    imageUrl.origin === endpoint.origin &&
    (imageUrl.pathname === endpointPath || imageUrl.pathname.startsWith(`${endpointPath}/`));

  if (file.fileId !== fileId) throw httpError(400, "ImageKit file ID does not match the uploaded asset");
  if (file.fileType !== "image") throw httpError(400, "The uploaded ImageKit file is not an image");
  if (typeof file.size !== "number" || !Number.isFinite(file.size) || file.size < 0) {
    throw httpError(400, "ImageKit did not return a valid image size");
  }
  if (file.size > MAX_IMAGE_BYTES) throw httpError(400, "Image must be no larger than 2 MB");
  const mime = (file.mime || "").toLowerCase();
  if (!ALLOWED_FORMATS.has(format) || (mime && !ALLOWED_MIMES.has(mime))) {
    throw httpError(400, "Only JPG, PNG, and WebP images are allowed");
  }
  if (!matchesEndpoint(actualUrl) || !matchesEndpoint(suppliedUrl)) {
    throw httpError(400, "Image URL does not match the configured ImageKit endpoint");
  }
  if (suppliedUrl.href !== actualUrl.href) {
    throw httpError(400, "Image URL does not match the uploaded ImageKit asset");
  }

  return { url: file.url, fileId: file.fileId };
}
