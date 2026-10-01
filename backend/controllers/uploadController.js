const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const localFilePath = req.file.path;

    // Check if Cloudinary is configured
    if (isCloudinaryConfigured()) {
      try {
        const result = await cloudinary.uploader.upload(localFilePath, {
          folder: 'teamflow-submissions',
          resource_type: 'auto',
        });

        // Delete temporary local file
        fs.unlink(localFilePath, (err) => {
          if (err) console.error('Failed to remove temp upload file:', err);
        });

        return res.status(200).json({
          success: true,
          fileUrl: result.secure_url,
          publicId: result.public_id,
          originalName: req.file.originalname,
          size: req.file.size,
        });
      } catch (cloudErr) {
        console.error('Cloudinary upload error:', cloudErr);
        // Fall back to local file serving
      }
    }

    // Local file fallback
    const fileName = path.basename(localFilePath);
    const serverUrl = `${req.protocol}://${req.get('host')}/uploads/${fileName}`;

    return res.status(200).json({
      success: true,
      fileUrl: serverUrl,
      publicId: fileName,
      originalName: req.file.originalname,
      size: req.file.size,
      storage: 'local',
    });
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
