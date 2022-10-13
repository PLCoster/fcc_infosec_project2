// Set up mongoose connection to MONGO DB:
const mongoose = require('mongoose');

// bcrypt for hashing
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

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
  expire_after_seconds: { type: Date, default: Date.now, expires: 86400 },
});

// Middleware to hash Thread and Reply deletion passwords when they are saved:
async function hashPasswordOnSave(next) {
  try {
    if (this.isModified('delete_password')) {
      this.delete_password = await bcrypt.hash(
        this.delete_password,
        SALT_ROUNDS,
      );
    }

    // Ensure passwords of all replies are hashed
    for (let i = 0; i < this.replies.length; i += 1) {
      const reply = this.replies[i];
      // Hack to only hash unhashed passwords (when inserting Threads with pre-existing replies e.g. during testing)
      if (reply.delete_password.slice(0, 4) !== '$2b$') {
        reply.delete_password = await bcrypt.hash(
          reply.delete_password,
          SALT_ROUNDS,
        );
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

threadSchema.pre('save', hashPasswordOnSave);

const Reply = mongoose.model('replies', replySchema);
const Thread = mongoose.model('threads', threadSchema);

module.exports = { Reply, Thread };
