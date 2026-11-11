const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    subject: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    resourceType: { type: String, enum: ['Notes', 'PYQ', 'Assignment', 'Other'], default: 'Notes' },
    fileUrl: { type: String, default: '' }, // filled after file upload is added
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resource', resourceSchema);
