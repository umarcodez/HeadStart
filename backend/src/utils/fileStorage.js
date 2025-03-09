const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
const initializeStorage = async () => {
    try {
        await fs.access(UPLOAD_DIR);
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
};

// Initialize storage on module load
initializeStorage().catch(console.error);

/**
 * Upload a file to the storage system
 * @param {Object} file - The file object from multer
 * @param {string} filepath - The desired file path (relative to upload directory)
 * @returns {Promise<string>} The URL of the uploaded file
 */
const uploadFile = async (file, filepath) => {
    const fileExt = path.extname(file.originalname);
    const filename = `${uuidv4()}${fileExt}`;
    const fullPath = path.join(UPLOAD_DIR, filepath);
    const fullFilePath = path.join(fullPath, filename);

    // Ensure directory exists
    await fs.mkdir(fullPath, { recursive: true });

    // Write file
    await fs.writeFile(fullFilePath, file.buffer);

    // Return relative URL
    return path.join(filepath, filename);
};

/**
 * Get the full URL for a file
 * @param {string} filepath - The relative file path
 * @returns {string} The full URL
 */
const getFileUrl = (filepath) => {
    if (!filepath) return null;
    return `/uploads/${filepath}`;
};

/**
 * Delete a file from storage
 * @param {string} filepath - The relative file path
 * @returns {Promise<void>}
 */
const deleteFile = async (filepath) => {
    if (!filepath) return;
    const fullPath = path.join(UPLOAD_DIR, filepath);
    try {
        await fs.unlink(fullPath);
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

module.exports = {
    uploadFile,
    getFileUrl,
    deleteFile
}; 