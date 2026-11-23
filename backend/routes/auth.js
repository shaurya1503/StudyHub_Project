const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const pub = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, course: u.course, semester: u.semester });

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, course, semester } = req.body;
    if (!name || name.trim().length < 2) return res.status(400).json({ message: 'Name is required' });
    if (!emailOk(email)) return res.status(400).json({ message: 'Valid email is required' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, course, semester });
    res.status(201).json({ token: sign(user), user: pub(user) });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!emailOk(email) || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: sign(user), user: pub(user) });
  } catch (err) { next(err); }
});

// GET /api/auth/me  -> profile + contributions
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'Invalid or expired token' });
    const [resources, posts, comments] = await Promise.all([
      Resource.find({ uploadedBy: user._id }).sort({ createdAt: -1 }),
      Post.countDocuments({ author: user._id }),
      Comment.countDocuments({ author: user._id })
    ]);
    res.json({ user: pub(user), resources, posts, comments });
  } catch (err) { next(err); }
});

module.exports = router;
