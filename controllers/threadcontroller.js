const { Reply, Thread } = require('../models/dbModels');
const { ObjectId } = require('mongoose').Types;

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

// Valid Thread and Reply _id are 24 alphanumeric characters
// If validated, ObjectIds are placed on res.locals
threadController.validateThreadAndReplyIDs = (req, res, next) => {
  let { thread_id, reply_id } = req.body;

  // If thread_id is not on body, see if it is in query params (GET)
  if (!thread_id) {
    thread_id = req.query.thread_id;
  }

  if (!thread_id) {
    return res.json({
      error: 'Required thread_id field missing from request body',
    });
  }

  try {
    res.locals.thread_id = ObjectId(thread_id);
    if (reply_id) {
      res.locals.reply_id = ObjectId(reply_id);
    }
  } catch (err) {
    return res.json({
      error:
        'Supplied thread_id and/or reply_id is not valid - must be 24 alphanumeric characters',
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

// Middleware to report a Thread on a given board by its _id
// Requires threadController.validateThreadAndReplyIDs to be called first
threadController.reportThreadByID = (req, res, next) => {
  const { board: board_name } = req.params;
  const { thread_id } = res.locals;

  if (!thread_id || !board_name) {
    return res.json({
      error:
        'Missing required field to report a Thread: Require non-empty "thread_id" field in body and "board" URL parameter',
    });
  }

  // Try to get Thread on Board:
  Thread.findOneAndUpdate({ board_name, _id: thread_id }, { reported: true })
    .then((result) => {
      if (result === null) {
        return res.json({
          error: `Could not find Thread ${thread_id} on Board ${board_name} to report, please try again`,
        });
      }
      next();
    })
    .catch((err) => {
      return next(
        `Error in threadController.reportThreadByID when trying to report a Thread: ${err.message}`,
      );
    });
};

// Middleware to delete a Thread on a given board by _id
// Requires threadController.validateThreadAndReplyIDs to be called first
threadController.deleteThreadByID = (req, res, next) => {
  const { board: board_name } = req.params;
  const { delete_password } = req.body;
  const { thread_id } = res.locals;

  if (!thread_id || !delete_password || !board_name) {
    return res.json({
      // !!! non-200 error code?
      error:
        'Missing required fields to delete a Thread - Require non-empty "thread_id" and "delete_password" body fields and non-empty "board" URL parameter',
    });
  }

  // Find thread based on given fields
  Thread.findOne({ board_name, _id: thread_id })
    .then((threadDoc) => {
      if (!threadDoc) {
        return res.json({
          error: `Thread ${thread_id} on Board ${board_name} not found for deletion`,
        });
      }

      if (threadDoc.delete_password !== delete_password) {
        return res.json('incorrect password');
      }

      // Otherwise Thread exists and password is correct, delete it:
      Thread.deleteOne({
        _id: thread_id,
        delete_password,
      }).then((deleteResult) => {
        // console.log('DELETE RESULT: ', deleteResult);
        if (deleteResult.deletedCount !== 1) {
          throw new Error('No document was deleted in database');
        }
        return next();
      });
    })
    .catch((err) => {
      return next(
        `Error in threadController.deleteThreadByID when trying to delete Thread Document: ${err.message}`,
      );
    });
};

// Middleware to get Thread and all its Replies by ID
// Requires threadController.validateThreadAndReplyIDs to be called first
threadController.getThreadByID = (req, res, next) => {
  const { thread_id: _id } = res.locals;
  const { board: board_name } = req.params;

  Thread.findOne({ _id, board_name })
    .then((threadDocument) => {
      if (!threadDocument) {
        return res.json({
          error: `Thread ${_id} on Board ${board_name} not found`,
        });
      }

      res.locals.threadDocument = threadDocument;
      return next();
    })
    .catch((err) => {
      return next(
        `Error in threadController.getThreadByID when trying to find a Thread: ${err.message}`,
      );
    });
};

// Middleware used during Testing only - Returns all fields of Thread by ID
threadController._getFullThreadInfoByID = (req, res, next) => {
  const { _id } = req.params;

  Thread.findOne({ _id })
    .then((threadDocument) => {
      if (!threadDocument) {
        return res.json('Thread not found');
      }

      res.locals.threadDocument = threadDocument;
      return next();
    })
    .catch((err) => {
      return next(
        `Error in threadController.getFullThreadInfo when trying to find a Thread: ${err.message}`,
      );
    });
};

module.exports = threadController;
