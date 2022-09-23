const { Reply, Thread } = require('../models/dbModels');

const threadController = {};

// Middleware to create a new Thread
threadController.createThread = (req, res, next) => {
  const { text, delete_password } = req.body;
  const { board: board_name } = req.params;

  if (!text || !delete_password || !board_name) {
    return res.json({
      error:
        'Missing required fields to create a new Thread - Require non-empty "text" and "delete_password" query parameters and non-empty "board" URL parameter',
    });
  }

  // Create a new Thread
  const currDate = Date.now();

  Thread.create({
    text,
    delete_password,
    board_name,
    created_on: currDate,
    bumped_on: currDate,
  })
    .then((document) => {
      const { _id, board_name, text, reported, created_on, bumped_on } =
        document;

      res.locals.createdThread = {
        _id,
        board_name,
        text,
        reported,
        created_on,
        bumped_on,
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
  Thread.find({ board_name }, { replies: { $slice: -3 } })
    .select(['-delete_password', '-reported'])
    .sort({ bumped_on: -1 })
    .limit(10)
    .then((documents) => {
      res.locals.boardThreads = documents;
      return next();
    })
    .catch((err) => {
      return next(err.message);
    });
};

module.exports = threadController;
