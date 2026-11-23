const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Resource = require('../models/Resource');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const dir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(dir, { recursive: true });

// Only these file types, max 10 MB (as written in the synopsis)
const ALLOWED = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.txt'];
const upload = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Only PDF, DOC, DOCX, PPT, PPTX, PNG, JPG or TXT files are allowed'))
});

// GET /api/resources?semester=3&subject=Data%20Structures&type=PYQ&q=stack
router.get('/', async (req, res, next) => {
  try {
    const { semester, subject, type, q } = req.query;
    const filter = {};
    if (semester) filter.semester = Number(semester);
    if (subject) filter.subject = subject;
    if (type) filter.resourceType = type;
    if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    res.json(await Resource.find(filter).sort({ createdAt: -1 }).populate('uploadedBy', 'name'));
  } catch (err) { next(err); }
});

// GET /api/resources/subjects  -> distinct subjects already uploaded
router.get('/subjects', async (req, res, next) => {
  try { res.json(await Resource.distinct('subject')); } catch (err) { next(err); }
});

// POST /api/resources  (multipart/form-data, file field name = "file")
router.post('/', requireAuth,
  (req, res, next) => upload.single('file')(req, res, (err) =>
    err ? res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File must be under 10 MB' : err.message }) : next()),
  async (req, res, next) => {
    try {
      const { title, description, subject, semester, resourceType } = req.body;
      if (!title || !subject || !semester) return res.status(400).json({ message: 'Title, subject and semester are required' });
      if (!req.file) return res.status(400).json({ message: 'Please choose a file to upload' });
      const doc = await Resource.create({
        title, description, subject, semester: Number(semester), resourceType,
        fileUrl: '/uploads/' + req.file.filename, uploadedBy: req.user.id
      });
      res.status(201).json(doc);
    } catch (err) { next(err); }
  });

// DELETE /api/resources/:id  (uploader or admin)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await Resource.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Resource not found' });
    if (req.user.role !== 'admin' && String(doc.uploadedBy) !== String(req.user.id))
      return res.status(403).json({ message: 'You can delete only your own uploads' });
    await doc.deleteOne();
    if (doc.fileUrl) fs.unlink(path.join(dir, path.basename(doc.fileUrl)), () => {});
    res.json({ message: 'Resource removed' });
  } catch (err) { next(err); }
});

module.exports = router;
