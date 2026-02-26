import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// CLOUDINARY_URL env var is auto-parsed by the SDK
cloudinary.config();

interface UploadResult {
  url: string;
  publicId: string;
}

export interface UploadOptions {
  folder?: string;
  resourceType?: "image" | "raw" | "auto";
  format?: string;
  quality?: string;
}

/**
 * Upload a file (Buffer from multer) or a direct URL to Cloudinary.
 * Defaults to the `ai-colab-chat` folder; pass `options.folder` to override.
 */
export const uploadToCloudinary = async (
  file: Buffer | string,
  options: UploadOptions = {},
): Promise<UploadResult> => {
  const {
    folder = "ai-colab-chat",
    resourceType = "auto",
    format,
    quality,
  } = options;

  if (typeof file === "string") {
    // It's a URL or base64 string
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: resourceType,
      format,
      quality,
    });
    return { url: result.secure_url, publicId: result.public_id };
  } else {
    // It's a Buffer (e.g., from Multer)
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType, format, quality },
        (error, result?: UploadApiResponse) => {
          if (error || !result)
            return reject(error || new Error("Upload failed"));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(file);
    });
  }
};

/**
 * Delete a file from Cloudinary by its public ID.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId);
};

/**
 * Extract publicId from a Cloudinary URL
 */
export const extractPublicId = (url: string): string | null => {
  try {
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
    return matches ? matches[1] : null;
  } catch (e) {
    return null;
  }
};
