import { Hono } from 'hono';
import { moltbookAuth } from '../middleware/moltbook-auth.js';
import { uploadRateLimiter } from '../middleware/rate-limiter.js';
import { storageService } from '../services/storage.service.js';
import { ValidationError } from '../utils/errors.js';
import { STORAGE } from '../config/constants.js';

const upload = new Hono();

// Upload image from file
upload.post('/image', moltbookAuth, uploadRateLimiter, async (c) => {
  const agent = c.get('agent');

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    throw new ValidationError('No file provided. Send file as multipart form data with key "file"');
  }

  // Validate file type
  if (!STORAGE.ALLOWED_IMAGE_TYPES.includes(file.type as typeof STORAGE.ALLOWED_IMAGE_TYPES[number])) {
    throw new ValidationError(
      `Invalid file type: ${file.type}. Allowed: ${STORAGE.ALLOWED_IMAGE_TYPES.join(', ')}`
    );
  }

  // Validate file size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > STORAGE.MAX_IMAGE_SIZE_MB) {
    throw new ValidationError(
      `File too large: ${sizeMB.toFixed(2)}MB. Maximum: ${STORAGE.MAX_IMAGE_SIZE_MB}MB`
    );
  }

  const url = await storageService.uploadImage(file, file.name, agent.id);

  return c.json({
    success: true,
    data: {
      url,
      filename: file.name,
      size_bytes: file.size,
      content_type: file.type,
    },
  }, 201);
});

// Upload image from URL
upload.post('/image/url', moltbookAuth, uploadRateLimiter, async (c) => {
  const agent = c.get('agent');

  const body = await c.req.json<{ url: string }>();

  if (!body.url) {
    throw new ValidationError('No URL provided. Send JSON body with "url" field');
  }

  // Basic URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(body.url);
  } catch {
    throw new ValidationError('Invalid URL format');
  }

  // Only allow https
  if (parsedUrl.protocol !== 'https:') {
    throw new ValidationError('Only HTTPS URLs are allowed');
  }

  const url = await storageService.uploadFromUrl(body.url, agent.id);

  return c.json({
    success: true,
    data: {
      url,
      source_url: body.url,
    },
  }, 201);
});

// List agent's uploaded images
upload.get('/images', moltbookAuth, async (c) => {
  const agent = c.get('agent');

  const images = await storageService.listImages(agent.id);

  return c.json({
    success: true,
    data: {
      images,
      count: images.length,
    },
  });
});

export { upload };
