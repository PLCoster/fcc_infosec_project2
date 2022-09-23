// Set up mongoose connection to MONGO DB:
const mongoose = require('mongoose');

const MONGO_URI =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_MONGO_URI
    : process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Database connection successful');
  })
  .catch((err) => {
    console.error('Database connection error');
  });

// https://mongoosejs.com/docs/guide.html
// https://mongoosejs.com/docs/api.html

// Schema for a Reply - Sub Document of Thread
const replySchema = new mongoose.Schema({
  text: String,
  created_on: { type: Date, default: Date.now },
  delete_password: String,
  reported: { type: Boolean, default: false },
  expire_after_seconds: { type: Date, default: Date.now, expires: 86400 },
});

// Schema for a Thread - Contains Array of Thread Sub Documents
// A Thread is associated with a specific Board
const threadSchema = new mongoose.Schema({
  board_name: String,
  text: String,
  created_on: Date,
  delete_password: String,
  reported: { type: Boolean, default: false },
  bumped_on: Date,
  replies: { type: [replySchema], default: [] },
  reply_count: { type: Number, default: 0 },
});

const Reply = mongoose.model('replies', replySchema);
const Thread = mongoose.model('threads', threadSchema);

module.exports = { Reply, Thread };
