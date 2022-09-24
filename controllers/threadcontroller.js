const { Reply, Thread } = require('../models/dbModels');

const threadController = {};

// Valid board names contain only [a-zA-Z0-9] characters
// board names are made lowercase
threadController.validateBoardName = (req, res, next) => {
  const { board: board_name } = req.params;

  if (/[^a-zA-Z-0-9]/.test(board_name)) {
    return res.json({
      // !!! non-200 error code?
      error: 'Board name cannot contain non-alphanumeric characters',
    });
  }

  return next();
};

// Middleware to create a new Thread
threadController.createThread = (req, res, next) => {
  const { text, delete_password } = req.body;
  const board_name = req.params.board; //.toLowerCase(); !!!

  if (!text || !delete_password || !board_name) {
    return res.json({
      // !!! non-200 error code?
      error:
        'Missing required fields to create a new Thread - Require non-empty "text" and "delete_password" query parameters and non-empty "board" URL parameter',
    });
  }

  // Create a new Thread Document
  const currDate = Date.now();

  Thread.create({
    text,
    delete_password,
    board_name,
    created_on: currDate,
    bumped_on: currDate,
  })
    .then((document) => {
      const {
        _id,
        board_name,
        text,
        reported,
        created_on,
        bumped_on,
        replies,
        reply_count,
      } = document;

      res.locals.createdThread = {
        _id,
        board_name,
        text,
        reported,
        created_on,
        bumped_on,
        replies,
        reply_count,
      };

      return next();
    })
    .catch((err) => {
      return next(
        `Error in threadController.createThread when trying to create a new Thread: ${err.message}`,
      );
    });
};

// Middleware to get the 10 Most Recent Threads for a board
// - 3 most recent replies for each Thread are returned
threadController.getTenMostRecentThreads = (req, res, next) => {
  const { board: board_name } = req.params;

  if (!board_name) {
    return res.json({
      error: 'Missing "board" URL parameter',
    });
  }

  // Get 10 most recent board posts each with 3 most recent replies
  Thread.find(
    { board_name },
    // '-delete_password -__v -reported -replies.delete_password -replies.expire_after_seconds -replies.reported',
    {
      delete_password: 0,
      __v: 0,
      reported: 0,
      'replies.delete_password': 0,
      'replies.expire_after_seconds': 0,
      'replies.reported': 0,
      // replies: { // Cannot seem to limit replies and exclude reply fields at the same time
      //   $slice: -3,
      // },
    },
  )
    .sort({ bumped_on: -1 })
    .limit(10)
    .then((documents) => {
      // Return the last 3 replies only for each thread
      documents = documents.map((thread) => {
        thread.replies = thread.replies.slice(-3);
        return thread;
      });
      res.locals.boardThreads = documents;
      return next();
    })
    .catch((err) => {
      return next(err.message);
    });
};

module.exports = threadController;
