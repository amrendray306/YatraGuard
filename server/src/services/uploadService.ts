import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import fs from 'fs';
import path from 'path';

function ensureCloudinaryConfig() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
  });
}

ensureCloudinaryConfig();

export const isCloudinaryConfigured = (): boolean => {
  ensureCloudinaryConfig();
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  return !!(
    cloud_name &&
    api_key &&
    api_secret &&
    api_key !== 'placeholder_set_by_user' &&
    api_secret !== 'placeholder_set_by_user' &&
    cloud_name !== 'placeholder_set_by_user'
  );
};

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function mimeFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_MIME.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are permitted.'));
  }
}

// Ensure local fallback uploads directory exists
const localUploadDir = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(localUploadDir)) {
  try {
    fs.mkdirSync(localUploadDir, { recursive: true });
  } catch (err) {
    console.warn('Could not create public/uploads directory:', err);
  }
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, localUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedExt = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `img-${uniqueSuffix}${sanitizedExt}`);
  },
});

// Cloudinary storage options
const cloudinaryProfileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: any, _file: any) => ({
    folder: 'yatraguard/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
    public_id: `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }),
} as any);

const cloudinaryCommunityStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req: any, _file: any) => ({
    folder: 'yatraguard/community',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1400, quality: 'auto', fetch_format: 'auto' }],
    public_id: `community_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }),
} as any);

export const uploadProfileMiddleware = (req: any, res: any, next: any) => {
  const storage = isCloudinaryConfigured() ? cloudinaryProfileStorage : diskStorage;
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: mimeFilter,
  }).single('image');

  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size for profile image is 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

export const uploadCommunityMiddleware = (req: any, res: any, next: any) => {
  const storage = isCloudinaryConfigured() ? cloudinaryCommunityStorage : diskStorage;
  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per image
    fileFilter: mimeFilter,
  }).array('images', 8); // Max 8 images per post

  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'One or more files exceed the 10MB limit.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Maximum of 8 images allowed per community post.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

export const deleteStoredImage = async (publicIdOrFilename?: string | null) => {
  if (!publicIdOrFilename) return;
  try {
    if (isCloudinaryConfigured() && !publicIdOrFilename.startsWith('img-')) {
      await cloudinary.uploader.destroy(publicIdOrFilename);
    } else {
      const filePath = path.join(localUploadDir, path.basename(publicIdOrFilename));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error('Failed to delete image resource:', err);
  }
};

// --- LOST & FOUND OPTIONAL IMAGE UPLOAD ---
export const uploadLostFoundMiddleware = (req: any, res: any, next: any) => {
  const storage = isCloudinaryConfigured() ? cloudinaryCommunityStorage : diskStorage;
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: mimeFilter,
  }).single('image');

  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// --- PRIVATE NON-PUBLIC TRAVEL DOCUMENT VAULT UPLOAD ---
export const privateVaultDir = path.resolve(process.cwd(), 'private_vault');
if (!fs.existsSync(privateVaultDir)) {
  try {
    fs.mkdirSync(privateVaultDir, { recursive: true });
  } catch (err) {
    console.warn('Could not create private_vault directory:', err);
  }
}

const VAULT_ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const VAULT_ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

const privateVaultStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(privateVaultDir)) {
      fs.mkdirSync(privateVaultDir, { recursive: true });
    }
    cb(null, privateVaultDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = VAULT_ALLOWED_EXT.includes(ext) ? ext : '.bin';
    const key = `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, key);
  },
});

export const uploadVaultDocumentMiddleware = (req: any, res: any, next: any) => {
  const upload = multer({
    storage: privateVaultStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB strict ceiling
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (VAULT_ALLOWED_MIME.includes(file.mimetype.toLowerCase()) && VAULT_ALLOWED_EXT.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Unsupported file type. Only PDF, JPEG, PNG, and WebP files are allowed.'));
      }
    },
  }).single('document');

  upload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Document exceeds the 5MB maximum size limit.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

export { cloudinary };
