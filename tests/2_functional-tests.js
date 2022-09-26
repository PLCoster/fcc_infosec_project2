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
let sampleThread;
let sampleThreadPassword;
let threadToDelete;

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
            sampleThreadPassword = body.delete_password;
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

            // Store Thread Document to be deleted in later test
            threadToDelete = threadArr[1]; // Sample Thread 10
            threadToDelete.delete_password = sampleThreads[9].delete_password; // Sample Thread 10 password

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

            // Check that thread is now reported:
            return chai
              .request(server)
              .get(`/api/thread_info/${body.thread_id}`);
          })
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200');
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.isTrue(
              res.body.reported,
              'Thread Document "reported" property should be "true"',
            );

            // Update local Thread Document to match one in DB for future tests
            sampleThread.reported = true;
            done();
          })
          .catch((err) => done(err));
      });

      test('PUT /api/threads/{board} with a non-existent Thread returns an error JSON', function (done) {
        const body = {
          thread_id: threadToDelete._id,
        };
        const board_name = 'nonexistentboard';

        const expectedResponse = {
          error: `Could not find Thread ${body.thread_id} on Board ${board_name} to report, please try again`,
        };

        chai
          .request(server)
          .put(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.deepEqual(
              res.body,
              expectedResponse,
              'Response Object should have "error" key and Thread not found message',
            );

            // Check that thread remains unreported:
            return chai
              .request(server)
              .get(`/api/thread_info/${body.thread_id}`);
          })
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200');
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.isFalse(
              res.body.reported,
              'Thread Document "reported" property should be "false"',
            );
            done();
          })
          .catch((err) => done(err));
      });

      test('PUT /api/threads/{board} with an invalid thread_id returns an error JSON', function (done) {
        const body = {
          thread_id: 'invalidID',
        };
        const board_name = validBoardName;

        const expectedResponse = {
          error:
            'Supplied thread_id and/or reply_id is not valid - must be 24 alphanumeric characters',
        };

        chai
          .request(server)
          .put(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.deepEqual(
              res.body,
              expectedResponse,
              'Response Object should have "error" key and invalid thread_id message',
            );
            done();
          })
          .catch((err) => done(err));
      });

      test('DELETE /api/threads/{board} with a valid thread_id and correct delete_password deletes a thread', function (done) {
        const body = {
          thread_id: threadToDelete._id,
          delete_password: threadToDelete.delete_password,
        };

        const board_name = validBoardName;

        const expectedResponse = 'success';

        chai
          .request(server)
          .delete(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.equal(
              res.body,
              expectedResponse,
              'Response should be "success", indicating Thread was deleted',
            );

            return chai
              .request(server)
              .get(`/api/thread_info/${body.thread_id}`);
          })
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.equal(
              res.body,
              'Thread not found',
              'Thread should not be found in Database after deletion',
            );
            done();
          })
          .catch((err) => done(err));
      });

      test('DELETE /api/threads/{board} with a valid thread_id but incorrect password does not delete thread', function (done) {
        const body = {
          thread_id: sampleThread._id,
          delete_password: 'badpassword123',
        };

        const board_name = validBoardName;

        const expectedResponse = 'incorrect password';

        chai
          .request(server)
          .delete(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.equal(
              res.body,
              expectedResponse,
              'Response should be "incorrect password", indicating Thread was not deleted',
            );

            return chai
              .request(server)
              .get(`/api/thread_info/${body.thread_id}`);
          })
          .then((threadInfoRes) => {
            assert.equal(
              threadInfoRes.status,
              200,
              'Response status should be 200',
            ); // !!!
            assert.equal(
              threadInfoRes.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.deepInclude(
              threadInfoRes.body,
              sampleThread,
              'Thread should still exist since deletion has failed',
            );
            done();
          })
          .catch((err) => done(err));
      });

      test('DELETE /api/threads/{board} with a valid thread_id and password but wrong board name does not delete thread', function (done) {
        const body = {
          thread_id: sampleThread._id,
          delete_password: sampleThreadPassword,
        };

        const board_name = 'wrongboardname';

        const expectedResponse = {
          error: `Thread ${body.thread_id} on Board ${board_name} not found for deletion`,
        };

        chai
          .request(server)
          .delete(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.deepEqual(
              res.body,
              expectedResponse,
              'Response should be "thread not found", error object',
            );

            // Ensure thread was not deleted
            return chai
              .request(server)
              .get(`/api/thread_info/${body.thread_id}`);
          })
          .then((threadInfoRes) => {
            assert.equal(
              threadInfoRes.status,
              200,
              'Response status should be 200',
            ); // !!!
            assert.equal(
              threadInfoRes.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.deepInclude(
              threadInfoRes.body,
              sampleThread,
              'Thread should still exist since deletion has failed',
            );
            done();
          })
          .catch((err) => done(err));
      });

      test('DELETE /api/threads/{board} with a non-existent thread_id', function (done) {
        const body = {
          thread_id: '0000007b7800494a175bf2bf', // Valid but non-existent id
          delete_password: 'bad_password',
        };

        const board_name = 'wrongboardname';

        const expectedResponse = {
          error: `Thread ${body.thread_id} on Board ${board_name} not found for deletion`,
        };

        chai
          .request(server)
          .delete(`/api/threads/${board_name}`)
          .send(body)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.deepEqual(
              res.body,
              expectedResponse,
              'Response should be "thread not found", error object',
            );

            done();
          })
          .catch((err) => done(err));
      });
    });

    suite('/api/replies/{board} => CRUD Replies on {board}', function () {
      test('GET /api/replies/{board}?thread_id={thread_id} with valid board and thread_id returns a Thread and all its Replies', function (done) {
        const { board_name, _id } = sampleThread;

        chai
          .request(server)
          .get(`/api/replies/${board_name}?thread_id=${_id}`)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200');
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.isObject(
              res.body,
              'Response body should be a Thread Document object',
            );
            assert.deepInclude(
              res.body,
              sampleThread,
              'Response body should be the desired Thread',
            );

            done();
          })
          .catch((err) => done(err));
      });

      test('GET /api/replies/{board}?thread_id={thread_id} with a non-existent Thread returns a "thread not found" error object', function (done) {
        const { board_name, _id } = {
          board_name: 'nonExistentBoard',
          _id: sampleThread._id,
        };

        const expectedResponse = {
          error: `Thread ${_id} on Board ${board_name} not found`,
        };

        chai
          .request(server)
          .get(`/api/replies/${board_name}?thread_id=${_id}`)
          .then((res) => {
            assert.equal(res.status, 200, 'Response status should be 200'); // !!!
            assert.equal(
              res.type,
              'application/json',
              'Response type should be application/json',
            );
            assert.deepEqual(
              res.body,
              expectedResponse,
              'Response body should be an error object with "thread not found" message',
            );
            done();
          })
          .catch((err) => done(err));
      });
    });
  });
});
