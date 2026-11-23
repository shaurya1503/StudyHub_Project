// Usage (from backend folder):  node makeAdmin.js your@email.com
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const email = (process.argv[2] || '').toLowerCase();
if (!email) { console.log('Usage: node makeAdmin.js your@email.com'); process.exit(1); }
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const u = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  console.log(u ? u.email + ' is now admin' : 'No user with that email - register first');
  process.exit(0);
}).catch((e) => { console.error(e.message); process.exit(1); });
