import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import cloudinary from './cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'movies', // hoặc 'banners', 'avatars'... tùy loại file
    resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
    public_id: Date.now() + '-' + file.originalname.split('.')[0],
  }),
});

const upload = multer({ storage });

export default upload;