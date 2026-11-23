const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    category: { type: String, enum: ['Academics', 'Doubts', 'Events', 'General'], default: 'General' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
