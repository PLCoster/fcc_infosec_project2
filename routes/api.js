'use strict';

const {
  validateBoardName,
  validateThreadAndReplyIDs,
  createThread,
  getTenMostRecentThreads,
  reportThreadByID,
  deleteThreadByID,
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
        console.log('DELETE ROUTE');
        return res.json('success');
      },
    );

  // POST request to /api/replies/:board adds Reply to Thread
  app
    .route('/api/replies/:board')

    // GET request to /api/replies/:board returns Thread and Replies
    .get(validateBoardName, (req, res) => {
      // !!!
      return res.json('TO DO!');
    })

    // POST request to /api/replies/:board creates Reply on Thread
    .post(validateBoardName, (req, res) => {
      // !!!
      return res.json('TO DO!');
    })

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
};
