const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

const { Thread } = require('../models/dbModels');

chai.use(chaiHttp);

const validBoardName = 'testboardname';

const sampleReplies = new Array(5).fill({}).map((el, i) => {
  return {
    text: `Sample Reply Text ${i + 1}`,
    delete_password: `Sample Delete Password ${i + 1}`,
  };
});

const currDate = Date.now();

const sampleThreads = new Array(10).fill({}).map((el, i) => {
  return {
    board_name: validBoardName,
    text: `Sample Thread Text ${i + 1}`,
    delete_password: `Sample Delete Password ${i + 1}`,
    replies: sampleReplies,
    reply_count: sampleReplies.length,
    created_on: currDate - (10 - i) * 10000,
    bumped_on: currDate - (10 - i) * 10000,
  };
});

// To hold a created Thread object for access in later tests
let SampleThread;

suite('Functional Tests', function () {
  suite('API Route Tests', function () {
    suiteSetup(function (done) {
      console.log('Emptying Threads collection before running tests....');
      Thread.deleteMany({})
        .then((res) => {
          if (!res.acknowledged) {
            throw new Error(
              'Error during API Suite Setup - Database Deletion Failed',
            );
          }

          // Add Sample Threads and Replies to Collection
          return Thread.insertMany(sampleThreads);
        })
        .then((result) => {
          if (!result) {
            throw new Error(
              'Error during API Suite Setup - Insertion of sample threads failed',
            );
          }
          done();
        })
        .catch((err) => done(err));
    });

    suiteTeardown(function (done) {
      console.log('Emptying Threads collection after running tests....');
      Thread.deleteMany({})
        .then((res) => {
          if (!res.acknowledged) {
            throw new Error(
              'Error during API Suite Teardown - Database Deletion Failed',
            );
          }
          done();
        })
        .catch((err) => done(err));
    });

    suite('/api/threads/{board} => CRUD Threads on {board}', function () {
      test('POST /api/threads/{board} with all required fields creates a new thread on board', function (done) {
        const body = {
          text: 'Sample Text Post',
          delete_password: 'Sample Delete Password',
        };

        const board_name = validBoardName;

        const expectedResponseKeys = [
          '_id',
          'board_name',
          'text',
          'reported',
          'created_on',
          'bumped_on',
          'replies',
          'reply_count',
        ];

        const expectedResponse = {
          board_name,
          text: body.text,
          reported: false,
          replies: [],
          reply_count: 0,
        };

        chai
          .request(server)
          .post(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200');
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.isObject(
              res.body,
              'Response body should be an object - a Thread Document',
            );
            assert.hasAllKeys(
              res.body,
              expectedResponseKeys,
              'Response Thread Document should have all expected keys',
            );
            assert.deepInclude(
              res.body,
              expectedResponse,
              'Response Thread Document should contain expected values for deterministic keys',
            );
            assert.equal(
              res.body.created_on,
              res.body.bumped_on,
              'Newly created Thread should have matching created_on and bumped_on date values',
            );

            // Store this Thread Document for access in future tests
            sampleThread = res.body;
            done();
          })
          .catch((err) => done(err));
      });

      test('POST /api/threads/{board} with missing required fields returns an error JSON', function (done) {
        const body = {
          text: '',
          delete_password: '',
        };

        const board_name = validBoardName;

        chai
          .request(server)
          .post(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.isObject(
              res.body,
              'Response body should be an object - an Error JSON',
            );
            assert.hasAllKeys(
              res.body,
              ['error'],
              'Response Object should have "error" key',
            );
            done();
          })
          .catch((err) => done(err));
      });

      test('GET /api/threads/{board} with a valid board name returns the most recent 10 threads', function (done) {
        const board_name = validBoardName;

        const expectedThreadResponseKeys = [
          '_id',
          'board_name',
          'text',
          'created_on',
          'bumped_on',
          'replies',
          'reply_count',
        ];

        const expectedReplyResponseKeys = ['_id', 'text', 'created_on'];

        chai
          .request(server)
          .get(`/api/threads/${board_name}`)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200');
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.isArray(
              res.body,
              'Response body should be an Array of Thread Documents',
            );

            const threadArr = res.body;
            assert.equal(
              threadArr.length,
              10,
              'Response should contain 10 Thread documents',
            );

            assert.hasAllKeys(
              threadArr[9],
              expectedThreadResponseKeys,
              'Returned Thread Documents have all expected keys',
            );

            // Last thread in Array should be the oldest - Sample Thread 2
            assert.deepInclude(
              threadArr[9],
              {
                board_name: validBoardName,
                text: 'Sample Thread Text 2',
                reply_count: 5,
              },
              'Last returned thread should be the oldest thread in the Array',
            );

            // First thread in Array should be Thread from previous Test
            assert.deepInclude(
              threadArr[0],
              {
                board_name: validBoardName,
                text: 'Sample Text Post',
                replies: [],
                reply_count: 0,
              },
              'First returned thread should be the most recently submitted Thread to the board',
            );

            // Check that only 3 replies with desired keys and values are returned
            assert.equal(
              threadArr[9].replies.length,
              3,
              'Returned Threads should have maximum of 3 replies',
            );
            assert.hasAllKeys(
              threadArr[9].replies[0],
              expectedReplyResponseKeys,
              'Returned Replies for Thread contain all expected keys',
            );

            // Check that replies in returned Thread are the expected Replies:
            sampleReplies
              .slice(-3)
              .map(({ text }) => ({ text }))
              .forEach((reply, i) => {
                assert.include(
                  threadArr[9].replies[i],
                  reply,
                  'Thread replies should be numbered 3, 4, 5 in replies Array',
                );
              });
            done();
          })
          .catch((err) => done(err));
      });

      test('PUT /api/threads/{board} with a valid board and thread_id reports a thread', function (done) {
        const body = {
          thread_id: sampleThread._id,
        };
        const board_name = sampleThread.board_name;

        const expectedResponse = 'reported';

        chai
          .request(server)
          .put(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200');
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.equal(
              res.body,
              expectedResponse,
              'Response body should be "reported"',
            );

            done();
          });
      });
    });
  });
});
