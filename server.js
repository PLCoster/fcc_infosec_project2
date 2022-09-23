'use strict';

// .env file can hold PORT / DB variables if desired
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

// Log incoming requests in development:
if (process.env.RUN_MODE === 'development') {
  app.use((req, res, next) => {
    console.log(
      `${req.method} ${req.path}; IP=${req.ip}; https?=${req.secure}`,
    );
    next();
  });
}

// Serve static files from 'public' folder
// http://expressjs.com/en/starter/static-files.html
app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ origin: '*' })); // For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sample Front-End - Boards and Individual Thread Pages
app.route('/b/:board/').get(function (req, res) {
  console.log('HIT ROUTE: ', req.params);
  res.sendFile(process.cwd() + '/views/board.html');
});
app.route('/b/:board/:threadid').get(function (req, res) {
  //!!! Check if thread exists here
  //If no thread return to home page
  console.log('THREAD HTML PAGE HIT');
  res.sendFile(process.cwd() + '/views/thread.html');
});

// Send index.html on requests to root
app.route('/').get(function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// For FCC testing purposes
fccTestingRoutes(app);

// Routing for API
apiRoutes(app);

// 404 page not found:
app.get('*', function (req, res) {
  // Redirect to index
  res.redirect('/');
});

// Internal Error Handler:
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server error: See Server Logs');
});

// Have server listen on PORT or default to 3000
// http://localhost:3000/
// Tests will run if NODE_ENV=test in .env file
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

module.exports = app; //for testing
