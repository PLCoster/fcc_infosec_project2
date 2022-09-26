'use strict';

const {
  validateBoardName,
  validateThreadAndReplyIDs,
  createThread,
  getTenMostRecentThreads,
  reportThreadByID,
  deleteThreadByID,
  getThreadByID,
  addReplyToThreadByID,
  _getFullThreadInfoByID,
} = require('../controllers/threadcontroller');

module.exports = function (app) {
  app
    .route('/api/threads/:board')

    // GET request to /api/threads/:board returns 10 most recent Threads for board
    // - each Thread has the 3 most recent replies
    .get(validateBoardName, getTenMostRecentThreads, (req, res) => {
      return res.json(res.locals.boardThreads);
    })

    // POST request to /api/threads/:board creates a new Thread on given board
    .post(validateBoardName, createThread, (req, res) => {
      return res.json(res.locals.createdThread);
    })

    // PUT request to /api/threads/:board reports a Thread
    .put(
      validateBoardName,
      validateThreadAndReplyIDs,
      reportThreadByID,
      (req, res) => {
        return res.json('reported');
      },
    )

    // DELETE request to /api/threads/:board deletes Thread
    .delete(
      validateBoardName,
      validateThreadAndReplyIDs,
      deleteThreadByID,
      (req, res) => {
        return res.json('success');
      },
    );

  // POST request to /api/replies/:board adds Reply to Thread
  app
    .route('/api/replies/:board')

    // GET request to /api/replies/:board?thread_id={thread_id} returns Thread and all Replies
    .get(
      validateBoardName,
      validateThreadAndReplyIDs,
      getThreadByID,
      (req, res) => {
        return res.json(res.locals.threadDocument);
      },
    )

    // POST request to /api/replies/:board creates Reply on Thread
    .post(
      validateBoardName,
      validateThreadAndReplyIDs,
      addReplyToThreadByID,
      (req, res) => {
        return res.json(res.locals.threadDocument);
      },
    )

    // https://stackoverflow.com/questions/26156687/mongoose-find-update-subdocument
    // PUT request to /api/replies/:board reports a Reply
    .put(validateBoardName, (req, res) => {
      // !!!
      return res.json('TO DO!');
    })

    // DELETE request to /api/replies/:board deletes a Reply
    .delete(validateBoardName, (req, res) => {
      // !!!
      return res.json('TO DO!');
    });

  // Testing only route to get full thread information
  if (process.env.NODE_ENV === 'test') {
    app
      .route('/api/thread_info/:_id')
      .get(_getFullThreadInfoByID, (req, res) => {
        return res.json(res.locals.threadDocument);
      });
  }
};
