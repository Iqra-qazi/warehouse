import ImageKit from "@imagekit/nodejs";
import httpError from "../utils/httpError.js";

let client;

const requiredImageKitVariables = [
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT",
];

function getEnvValue(key) {
  const rawValue = process.env[key];
  if (typeof rawValue !== "string") return "";
  const value = rawValue.trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1).trim();
  }
  return value;
}

const missingImageKitVariables = requiredImageKitVariables.filter((key) => !getEnvValue(key));

if (missingImageKitVariables.length) {
  console.warn(
    `ImageKit is not fully configured. Missing ${missingImageKitVariables.join(", ")}; ImageKit operations will be unavailable.`
  );
}

export function getImageKitSettings() {
  const publicKey = getEnvValue("IMAGEKIT_PUBLIC_KEY");
  const endpointValue = getEnvValue("IMAGEKIT_URL_ENDPOINT");
  const missing = requiredImageKitVariables.filter((key) => !getEnvValue(key));
  if (missing.length) {
    throw httpError(503, `ImageKit is not configured. Missing ${missing.join(", ")}`);
  }
  let endpoint;
  try {
    endpoint = new URL(endpointValue);
  } catch {
    throw httpError(503, "IMAGEKIT_URL_ENDPOINT is invalid");
  }
  if (endpoint.protocol !== "https:") {
    throw httpError(503, "IMAGEKIT_URL_ENDPOINT must use HTTPS");
  }
  return {
    publicKey,
    urlEndpoint: `${endpoint.origin}${endpoint.pathname.replace(/\/+$/, "")}`,
  };
}

export function getImageKitClient() {
  const privateKey = getEnvValue("IMAGEKIT_PRIVATE_KEY");
  if (!privateKey) {
    throw httpError(503, "ImageKit is not configured. Missing IMAGEKIT_PRIVATE_KEY");
  }
  if (!client) client = new ImageKit({ privateKey });
  return client;
}
