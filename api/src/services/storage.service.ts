import { db } from '../db/client.js';
import { STORAGE } from '../config/constants.js';
import { ValidationError, AppError } from '../utils/errors.js';

class StorageService {
  private bucketName = STORAGE.BUCKET_NAME;

  async uploadImage(
    file: File | Blob,
    filename: string,
    agentId: string
  ): Promise<string> {
    // Validate file type
    const contentType = file.type as typeof STORAGE.ALLOWED_IMAGE_TYPES[number];
    if (!STORAGE.ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new ValidationError(
        `Invalid file type. Allowed: ${STORAGE.ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > STORAGE.MAX_IMAGE_SIZE_MB) {
      throw new ValidationError(
        `File too large. Maximum size: ${STORAGE.MAX_IMAGE_SIZE_MB}MB`
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = contentType.split('/')[1] || 'png';
    const uniqueFilename = `${agentId}/${timestamp}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await db.storage
      .from(this.bucketName)
      .upload(uniqueFilename, file, {
        contentType,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new AppError('Failed to upload image', 500, 'STORAGE_ERROR');
    }

    // Get public URL
    const { data: urlData } = db.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }

  async uploadFromUrl(
    imageUrl: string,
    agentId: string
  ): Promise<string> {
    // Fetch the image
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new ValidationError(`Failed to fetch image from URL: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';

    if (!STORAGE.ALLOWED_IMAGE_TYPES.some(type => contentType.startsWith(type.split('/')[0]))) {
      throw new ValidationError(
        `Invalid image type from URL. Allowed: ${STORAGE.ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    const blob = await response.blob();

    // Extract filename from URL or generate one
    const urlPath = new URL(imageUrl).pathname;
    const filename = urlPath.split('/').pop() || 'image';

    return this.uploadImage(blob, filename, agentId);
  }

  async deleteImage(path: string): Promise<void> {
    const { error } = await db.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      // Don't throw - deletion failures are not critical
    }
  }

  async listImages(agentId: string): Promise<string[]> {
    const { data, error } = await db.storage
      .from(this.bucketName)
      .list(agentId);

    if (error) {
      console.error('Storage list error:', error);
      return [];
    }

    return data.map(file => {
      const { data: urlData } = db.storage
        .from(this.bucketName)
        .getPublicUrl(`${agentId}/${file.name}`);
      return urlData.publicUrl;
    });
  }

  // Convert URL to Blob for Pump.fun upload
  async urlToBlob(imageUrl: string): Promise<Blob> {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new ValidationError(`Failed to fetch image: ${response.status}`);
    }

    return response.blob();
  }
}

export const storageService = new StorageService();
