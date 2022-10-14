# Free Code Camp: Information Security Project 2

## Anonymous Message Board

The aim of this project was to build an Anonymous Message Board app with functionality similar to: https://anonymous-message-board.freecodecamp.rocks/

The project was built using the following technologies:

- **HTML**
- **JavaScript** with **[Node.js](https://nodejs.org/en/) / [NPM](https://www.npmjs.com/)** for package management.
- **[Express](https://expressjs.com/)** web framework to build the web API.
- **[mongoose](https://mongoosejs.com/)** for MongoDB object modeling, interacting with a **[MongoDB Atlas](https://www.mongodb.com/atlas/database)** database.
- **[Helmet](https://helmetjs.github.io/)** for Express.js security with HTTP headers.
- **[bcrypt](https://www.npmjs.com/package/bcryptjs)** for hashing and comparing Thread and Reply deletion passwords.
- **[Bootstrap](https://getbootstrap.com/)** for styling with some custom **CSS**.
- **[FontAwesome](https://fontawesome.com/)** for icons.
- **[Mocha](https://mochajs.org/)** test framework with **[Chai](https://www.chaijs.com/)** assertions for testing.
- **[nodemon](https://nodemon.io/)** for automatic restarting of server during development.

### Project Requirements:

- **User Story #1:** Only allow your site to be loaded in an iFrame on your own pages, using `helmet.js`.

- **User Story #2:** Do not allow DNS prefetching, using `helmet.js`.

- **User Story #3** Only allow your site to send the referrer for your own pages, using `helmet.js`.

- **User Story #4** You can send a POST request to `/api/threads/{board}` with form data including `text` and `delete_password`. The saved database record will have at least the fields `_id`, `text`, `created_on`(date & time), `bumped_on`(date & time, starts same as `created_on`), `reported` (boolean), `delete_password`, & `replies` (array).

- **User Story #5** You can send a POST request to `/api/replies/{board}` with form data including `text`, `delete_password`, & `thread_id`. This will update the `bumped_on` date to the comment's date. In the thread's `replies` array, an object will be saved with at least the properties `_id`, `text`, `created_on`, `delete_password`, & `reported`.

- **User Story #6** You can send a GET request to `/api/threads/{board}`. Returned will be an array of the most recent 10 bumped threads on the board with only the most recent 3 replies for each. The `reported` and `delete_password` fields will not be sent to the client.

- **User Story #7** You can send a GET request to `/api/replies/{board}?thread_id={thread_id}`. Returned will be the entire thread with all its replies, also excluding the same fields from the client as the previous test.

- **User Story #8** You can send a DELETE request to `/api/threads/{board}` and pass along the `thread_id` & `delete_password` to delete the thread. Returned will be the string `incorrect password` or `success`.

- **User Story #9** You can send a DELETE request to `/api/replies/{board}` and pass along the `thread_id`, `reply_id`, & `delete_password`. Returned will be the string `incorrect password` or `success`. On success, the text of the `reply_id` will be changed to `[deleted]`.

- **User Story #10** You can send a PUT request to `/api/threads/{board}` and pass along the `thread_id`. Returned will be the string `reported`. The `reported` value of the `thread_id` will be changed to `true`.

- **User Story #11** You can send a PUT request to `/api/replies/{board}` and pass along the `thread_id` & `reply_id`. Returned will be the string `reported`. The `reported` value of the `reply_id` will be changed to `true`.

- **User Story #12** The 10 following function tests for the app API routes are complete and passing:
  - Creating a new thread: POST request to `/api/threads/{board}`
  - Viewing the 10 most recent threads with 3 replies each: GET request to `/api/threads/{board}`
  - Deleting a thread with the incorrect password: DELETE request to `/api/threads/{board}` with an invalid `delete_password`
  - Deleting a thread with the correct password: DELETE request to `/api/threads/{board}` with a valid `delete_password`
  - Reporting a thread: PUT request to `/api/threads/{board}`
  - Creating a new reply: POST request to `/api/replies/{board}`
  - Viewing a single thread with all replies: GET request to `/api/replies/{board}`
  - Deleting a reply with the incorrect password: DELETE request to `/api/replies/{board}` with an invalid `delete_password`
  - Deleting a reply with the correct password: DELETE request to `/api/replies/{board}` with a valid `delete_password`
  - Reporting a reply: PUT request to `/api/replies/{board}`

### Project Writeup:

The second Free Code Camp: Information Security Project is a basic Anonymous Message Board App and API. Users can anonymously post Threads, and add Replies to existing Threads. Created Threads and Replies can be deleted using a password that is input by the user as they create their Thread or Reply. Passwords are hashed using `bcrypt` before being stored in a MongoDB database, for added security.

Users can:

- View the 10 Most Recently Active Threads on a Board by visiting the board on the web app, or by sending a GET request to `/api/threads/<BOARD>` where `<BOARD>` is the name of the desired board to view.

- View a single Thread and all its Replies by visiting a thread on the web app, or by sending a GET request to `/api/replies/<BOARD>?thread_id=<THREAD_ID>` with the desired Board and Thread id.

- Create a Thread using the web app (visiting the page corresponding to the board they wish to post on), or by sending a POST request to `/api/threads/<BOARD>` with a body consisting of url encoded or JSON encoded fields of `text` (Thread text) and `delete-password`.

- Report a Thread using the web app, or by sending a PUT request to `/api/threads/<BOARD>` with a body containing a url or JSON encoded field of `thread_id` (id of the thread to be reported).

- Delete a Thread using the web app, or by sending a DELETE request to `/api/threads/<BOARD>` with a body containing url or JSON encoded fields of `thread_id` and `delete-password`.

- Add a Reply to a Thread using the web app, or by sending a POST request to `/api/replies/<BOARD>` with a body containing url or JSON encoded fields of `thread_id`, `text` (Reply text) and `delete_password` (password to delete the created Reply).

- Report a Reply using the web app, or by sending a PUT request to `/api/replies/<BOARD>` with a body containing url or JSON encoded fields of `thread_id` and `reply_id`.

- Delete a Reply using the web app, or by sending a DELETE request to `/api/replies/<BOARD>` with a body containing url or JSON encoded fields of thread_id, reply_id and delete_password (password of the Reply to be deleted).

A test suite has been written for the app:

- `tests/2_functional-tests.js` contains functional tests of the application routes (GET/POST/PUT/DELETE requests to `/api/threads` and `/api/replies`).

### Project Files:

- `server.js` - the main entry point of the application, an express web server handling the routes defined in the specification.

- `/routes/api.js` - contains the major API routes for the express web app.

- `controllers/` - contains the `threadcontroller.js` middleware, with methods to Create, Read, Update (report) and Delete Threads and Replies.

- `models/` - contains `mongoose` database schema (`Thread` and `Reply`) and middleware for the application. A middleware has been added to the `Thread` schema to hash Thread deletion passwords automatically when a Thread is created.

- `public/` - contains static files for the web app (stylesheet, logo, favicons etc), served by express using `express.static()`.

- `views/` - contains the html pages for the web app:

  - `index.html`, which is served by express on `GET` requests to `/`
  - `board.html`, which is served by express on `GET` requests to `/b/<BOARD_NAME>`
  - `thread.html`, which is served by express on `GET` requests to `/b/<BOARD_NAME>/<THREAD_ID>`

- `tests/` - contains the test suite for the application.

### Usage:

Requires Node.js / NPM in order to install required packages. After downloading the repo, install required dependencies with:

`npm install`

To run the app locally, valid production and testing MongoDB database URIs are required to be entered as environmental variables (`MONGO_URI`, `TEST_MONGO_URI`), which can be done via a `.env` file (see sample.env). One possible MongoDB service is **[MongoDB Atlas](https://www.mongodb.com/atlas/database)**.

A development mode (with auto server restart on file save), can be started with:

`npm run dev`

The application can then be viewed at `http://localhost:3000/` in the browser.

To start the server without auto-restart on file save:

`npm start`

To run the test suite:

`npm test`

# Anonymous Message Board

The initial boilerplate for this app can be found at https://anonymous-message-board.freecodecamp.rocks/

Instructions for building the project can be found at https://www.freecodecamp.org/learn/information-security/information-security-projects/anonymous-message-board
