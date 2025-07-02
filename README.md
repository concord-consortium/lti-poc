# lti-poc

Proof-of-concept explorations for LTI 1.3 integration

This POC uses the [`ltijs`](https://github.com/Cvmcosta/ltijs) library to create a LTI tool server with a few demo resources.

The main entry point is index.ts, which adds the api routes and then starts the lti server.

## Initial Setup

1. Clone this repo
2. Run `npm ci` to install the dependencies
3. Copy `.env.sample` to `.env`
4. Run something like `ngrok` or `localtunnel` to get an https endpoint for port 3000 (eg `ngrok http 3000`) and then set the `PUBLIC_URL` value in `.env` to the https url.  LTI requires the endpoints be https.
5. Run `docker compose up` in one terminal window to start the MySQL instance used by the server
6. Run `npm start` to start the server on port 3000
7. Load http://localhost:3000 and the public https url from step 4 to ensure the homepage loads
8. Use the registration url shown on the homepage to register the server with an LMS that supports LT1 1.3

NOTE: `ngrok` only hands out stable urls if you pay them.  The url will remain the same until you close `ngrok` or it loses a connection to the Internet.  When that happens you will need to restart `ngrok` and update the `PUBLIC_URL` value in the `.env` file and re-register the tool in any LMSes you have it registered with.

## Debugging

The `ltijs` library uses the [`debug`](https://www.npmjs.com/package/debug) npm module for logging.  That module allows developers to namespace console logs so that output is controlled by a `DEBUG` environment variable.  To see all debug statements run `export DEBUG=*` in the terminal window before running `npm start`.  To see specific module output search for [`debug`](https://github.com/search?q=repo%3ACvmcosta%2Fltijs%20debug&type=code) in the GitHub repo and use the module names you see there (eg: `export DEBUG=provider:auth` or `export DEBUG=provider:gradeService`).
