const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Magic byte signatures for allowed image types
const MAGIC_BYTES = {
  jpg: [Buffer.from([0xFF, 0xD8, 0xFF])],
  png: [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  gif: [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  webp: [Buffer.from('RIFF')], // followed by file size then "WEBP"
};

function validateMagicBytes(filePath, ext) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);

  const normalExt = ext.replace('.', '').toLowerCase();
  const alias = normalExt === 'jpeg' ? 'jpg' : normalExt;
  const sigs = MAGIC_BYTES[alias];
  if (!sigs) return false;

  // Special case for WebP: must start with RIFF....WEBP
  if (alias === 'webp') {
    return buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  }

  return sigs.some(sig => buf.slice(0, sig.length).equals(sig));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const subDir = path.join(UPLOAD_DIR, 'products');
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
    cb(null, subDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not allowed. Allowed: ${ALLOWED_EXTS.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 5, // max 5 files per request
  },
});

/**
 * Post-upload middleware: validates magic bytes of uploaded files.
 * Deletes files that fail validation.
 */
function validateUploadedFiles(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!validateMagicBytes(file.path, ext)) {
      // Delete the invalid file
      try { fs.unlinkSync(file.path); } catch (_) {}
      return res.status(400).json({
        code: 'INVALID_FILE_TYPE',
        message: `File "${file.originalname}" content does not match its extension. Upload rejected.`,
      });
    }
  }
  next();
}

module.exports = { upload, UPLOAD_DIR, validateUploadedFiles };
