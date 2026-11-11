// Adds demo data: 1 admin, 1 student, a few resources (with sample files) and posts.
// WARNING: this clears the existing users, resources, posts and comments.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Resource = require('./models/Resource');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studyhub', { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.deleteMany(), Resource.deleteMany(), Post.deleteMany(), Comment.deleteMany()]);

  const admin = await User.create({ name: 'Admin', email: 'admin@studyhub.com', password: await bcrypt.hash('admin123', 10), role: 'admin', semester: 8 });
  const student = await User.create({ name: 'Demo Student', email: 'student@studyhub.com', password: await bcrypt.hash('student123', 10), semester: 3 });

  const uploadDir = path.join(__dirname, 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  const demo = [
    ['Arrays and Linked Lists – Unit 1 Notes', 'Data Structures', 3, 'Notes', student],
    ['Data Structures PYQ 2025', 'Data Structures', 3, 'PYQ', admin],
    ['Logic Gates and Boolean Algebra', 'Digital Electronics', 3, 'Notes', student],
    ['DBMS Normalization Notes', 'Database Management Systems', 4, 'Notes', admin],
    ['Software Engineering – SDLC Models', 'Software Engineering', 5, 'Notes', student]
  ];
  let i = 1;
  for (const [title, subject, semester, resourceType, by] of demo) {
    const fname = 'sample-' + i++ + '.txt';
    fs.writeFileSync(path.join(uploadDir, fname), 'SAMPLE FILE\n' + title + '\n\nThis is a demo file added by seed.js. Upload real notes from the website.\n');
    await Resource.create({ title, subject, semester, resourceType, fileUrl: '/uploads/' + fname, uploadedBy: by._id });
  }

  const p1 = await Post.create({ content: 'Can someone explain the difference between a stack and a queue with a real-life example?', category: 'Doubts', author: student._id });
  await Post.create({ content: 'Data Structures PYQs for the last years are available in Study Point.', category: 'Academics', author: admin._id });
  await Comment.create({ text: 'Stack is like a pile of plates, queue is like a line at a ticket counter.', post: p1._id, author: admin._id });

  console.log('Seed done.\nAdmin:   admin@studyhub.com / admin123\nStudent: student@studyhub.com / student123');
  process.exit(0);
})().catch((e) => { console.error('Seed failed:', e.message); process.exit(1); });
