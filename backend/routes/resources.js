const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Resource = require('../models/Resource');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ---- file upload settings (Multer) ----
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png'];
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'))
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    allowed.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Only PDF, DOC, PPT, TXT or image files are allowed'))
});
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File must be under 10 MB' : err.message });
    next();
  });
}

// GET /api/resources?semester=3&subject=Data%20Structures&type=PYQ&q=stack
router.get('/', async (req, res, next) => {
  try {
    const { semester, subject, type, q } = req.query;
    const filter = {};
    if (semester) filter.semester = Number(semester);
    if (subject) filter.subject = subject;
    if (type) filter.resourceType = type;
    if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const list = await Resource.find(filter).sort({ createdAt: -1 }).populate('uploadedBy', 'name');
    res.json(list);
  } catch (err) { next(err); }
});

// POST /api/resources  (multipart form: title, subject, semester, resourceType, file)
router.post('/', requireAuth, handleUpload, async (req, res, next) => {
  try {
    const { title, description, subject, semester, resourceType } = req.body;
    if (!title || !subject || !semester) return res.status(400).json({ message: 'Title, subject and semester are required' });
    const doc = await Resource.create({
      title, description, subject, semester, resourceType,
      fileUrl: req.file ? '/uploads/' + req.file.filename : '',
      uploadedBy: req.user.id
    });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// DELETE /api/resources/:id  (admin only) – also removes the stored file
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const doc = await Resource.findByIdAndDelete(req.params.id);
    if (doc && doc.fileUrl) fs.unlink(path.join(uploadDir, path.basename(doc.fileUrl)), () => {});
    res.json({ message: 'Resource removed' });
  } catch (err) { next(err); }
});

module.exports = router;
