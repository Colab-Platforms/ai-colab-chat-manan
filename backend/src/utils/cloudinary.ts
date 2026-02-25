import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// CLOUDINARY_URL env var is auto-parsed by the SDK
cloudinary.config();

interface UploadResult {
    url: string;
    publicId: string;
}

interface UploadOptions {
    folder?: string;
    resourceType?: "image" | "raw" | "auto";
}

/**
 * Upload a file buffer to Cloudinary.
 * Defaults to the `ai-colab-chat` folder; pass `options.folder` to override.
 */
export const uploadToCloudinary = (
    fileBuffer: Buffer,
    options: UploadOptions = {}
): Promise<UploadResult> => {
    const { folder = "ai-colab-chat", resourceType = "auto" } = options;

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result?: UploadApiResponse) => {
                if (error || !result) return reject(error || new Error("Upload failed"));
                resolve({ url: result.secure_url, publicId: result.public_id });
            }
        );
        stream.end(fileBuffer);
    });
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
