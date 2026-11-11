require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// ---- API routes ----
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'StudyHub API' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));

// ---- Uploaded files and the frontend (so everything runs on one address) ----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('StudyHub running at http://localhost:' + PORT));

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/studyhub', { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection failed:', err.message));
