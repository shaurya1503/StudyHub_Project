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
    if (!(await Post.exists({ _id: req.params.id }))) return res.status(404).json({ message: 'Post not found' });
    res.status(201).json(await Comment.create({ text: req.body.text, post: req.params.id, author: req.user.id }));
  } catch (err) { next(err); }
});

// owner or admin check
const canEdit = (doc, user) => user.role === 'admin' || String(doc.author) === String(user.id);

// PUT /api/posts/:id  (owner or admin)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!canEdit(post, req.user)) return res.status(403).json({ message: 'You can edit only your own posts' });
    if (!req.body.content || !req.body.content.trim()) return res.status(400).json({ message: 'Post content is required' });
    post.content = req.body.content;
    if (req.body.category) post.category = req.body.category;
    res.json(await post.save());
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id  (owner or admin)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!canEdit(post, req.user)) return res.status(403).json({ message: 'You can delete only your own posts' });
    await Comment.deleteMany({ post: post._id });
    await post.deleteOne();
    res.json({ message: 'Post removed' });
  } catch (err) { next(err); }
});

// PUT /api/posts/comments/:cid  (owner or admin)
router.put('/comments/:cid', requireAuth, async (req, res, next) => {
  try {
    const c = await Comment.findById(req.params.cid);
    if (!c) return res.status(404).json({ message: 'Comment not found' });
    if (!canEdit(c, req.user)) return res.status(403).json({ message: 'You can edit only your own comments' });
    if (!req.body.text || !req.body.text.trim()) return res.status(400).json({ message: 'Comment text is required' });
    c.text = req.body.text;
    res.json(await c.save());
  } catch (err) { next(err); }
});

// DELETE /api/posts/comments/:cid  (owner or admin)
router.delete('/comments/:cid', requireAuth, async (req, res, next) => {
  try {
    const c = await Comment.findById(req.params.cid);
    if (!c) return res.status(404).json({ message: 'Comment not found' });
    if (!canEdit(c, req.user)) return res.status(403).json({ message: 'You can delete only your own comments' });
    await c.deleteOne();
    res.json({ message: 'Comment removed' });
  } catch (err) { next(err); }
});

module.exports = router;
