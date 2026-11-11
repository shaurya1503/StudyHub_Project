const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
const sign = (u) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

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
    res.status(201).json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
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
    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

module.exports = router;
