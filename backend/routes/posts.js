const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts
router.get('/', async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate('author', 'name').lean();
    const comments = await Comment.find({ post: { $in: posts.map((p) => p._id) } }).populate('author', 'name').lean();
    posts.forEach((p) => { p.comments = comments.filter((c) => String(c.post) === String(p._id)); });
    res.json(posts);
  } catch (err) { next(err); }
});

// POST /api/posts
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { content, category } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Post content is required' });
    res.status(201).json(await Post.create({ content, category, author: req.user.id }));
  } catch (err) { next(err); }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    if (!req.body.text || !req.body.text.trim()) return res.status(400).json({ message: 'Comment text is required' });
    res.status(201).json(await Comment.create({ text: req.body.text, post: req.params.id, author: req.user.id }));
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id  (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await Comment.deleteMany({ post: req.params.id });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post removed' });
  } catch (err) { next(err); }
});

module.exports = router;
