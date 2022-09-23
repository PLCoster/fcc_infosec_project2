'use strict';

const {
  createThread,
  getTenMostRecentThreads,
} = require('../controllers/threadcontroller');

module.exports = function (app) {
  app
    .route('/api/threads/:board')

    // GET request to /api/threads/board returns 10 most recent Threads for board
    // - each Thread has the 3 most recent replies
    .get(getTenMostRecentThreads, (req, res) => {
      return res.json(res.locals.boardThreads);
    })

    // POST request to /api/threads/board creates a new Thread on given board
    .post(createThread, (req, res) => {
      return res.json(res.locals.createdThread);
    });

  app.route('/api/replies/:board');
};
