import { useEffect, useId, useRef, useState } from "react";
import { upload } from "@imagekit/react";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import Button from "./Button.jsx";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 2 * 1024 * 1024;

export default function ImageUploader({
  value,
  onChange,
  onUpload,
  onUploadingChange,
  label = "Upload image",
  disabled = false,
  folder = "user-profiles",
  className = "",
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPreview, setSelectedPreview] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedFile) {
      setSelectedPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setSelectedPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedFile]);

  const valueUrl = typeof value === "string" ? value : value?.url || "";
  const previewUrl = selectedPreview || uploadedImage?.url || (!removed ? valueUrl : "");

  useEffect(() => {
    setRemoved(false);
  }, [valueUrl]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");

    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      setSelectedFile(null);
      const message = "Choose a JPG, PNG, or WebP image.";
      setError(message);
      toast.error(message);
      event.target.value = "";
      return;
    }
    if (file.size > maxFileSize) {
      setSelectedFile(null);
      const message = "Image must be 2 MB or smaller.";
      setError(message);
      toast.error(message);
      event.target.value = "";
      return;
    }

    setUploadedImage(null);
    setRemoved(false);
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || uploading) return;

    setUploading(true);
    onUploadingChange?.(true);
    setError("");
    try {
      const { data: auth } = await api.get("/upload/auth");
      const publicKey = auth?.publicKey || import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
      if (!publicKey) throw new Error("ImageKit public key is not configured.");
      if (
        !auth?.signature ||
        !auth?.token ||
        !Number.isFinite(Number(auth?.expire)) ||
        Number(auth.expire) <= Math.floor(Date.now() / 1000)
      ) {
        throw new Error("ImageKit upload authorization was incomplete.");
      }

      const result = await upload({
        file: selectedFile,
        fileName: selectedFile.name,
        publicKey,
        token: auth.token,
        expire: Number(auth.expire),
        signature: auth.signature,
        folder,
        useUniqueFileName: true,
      });
      if (typeof result.url !== "string" || typeof result.fileId !== "string") {
        throw new Error("ImageKit response did not include the image URL and file ID.");
      }

      const image = { url: result.url, fileId: result.fileId };
      const onImageReady = onUpload || onChange;
      if (onImageReady) await onImageReady(image);
      setUploadedImage(image);
      setSelectedFile(null);
      setRemoved(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch (uploadError) {
      const message = uploadError.response?.data?.message || uploadError.message || "Image upload failed.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  function handleRemove() {
    setSelectedFile(null);
    setUploadedImage(null);
    setRemoved(true);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    (onUpload || onChange)?.(null);
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-[12.5px] font-medium text-app-text" htmlFor={inputId}>
        {label}
      </label>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="block w-full text-sm text-app-muted file:mr-3 file:h-9 file:rounded-md file:border file:border-app-border file:bg-app-subtle file:px-3 file:text-sm file:font-medium file:text-app-text hover:file:bg-app-border disabled:opacity-60"
        disabled={disabled || uploading}
        id={inputId}
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
      {previewUrl && (
        <img
          alt="Selected image preview"
          className="h-40 w-40 rounded-lg border border-app-border bg-app-subtle object-cover"
          src={previewUrl}
        />
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!selectedFile || disabled}
          loading={uploading}
          onClick={handleUpload}
          type="button"
        >
          {uploading ? "Uploading..." : "Upload image"}
        </Button>
        {(previewUrl || selectedFile) && (
          <Button disabled={uploading} onClick={handleRemove} variant="secondary">
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
