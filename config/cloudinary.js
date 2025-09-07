const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (file, folder = 'chef-en-place') => {
  try {
    // Handle both file paths (local) and buffers (serverless)
    const uploadOptions = {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' },
      ],
    };

    let result;
    if (typeof file === 'string') {
      // File path (local development)
      result = await cloudinary.uploader.upload(file, uploadOptions);
    } else if (file.buffer) {
      // Buffer (serverless environment)
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
    } else {
      throw new Error('Invalid file format');
    }

    return result;
  } catch (error) {
    console.error('Image upload error:', error);
    throw new Error('Image upload failed');
  }
};

const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Image deletion failed:', error);
  }
};

module.exports = { uploadImage, deleteImage };
