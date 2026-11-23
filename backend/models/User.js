const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    course: { type: String, default: 'B.Tech CSE' },
    semester: { type: Number, min: 1, max: 8, default: 1 },
    role: { type: String, enum: ['student', 'admin'], default: 'student' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
