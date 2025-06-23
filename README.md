# lti-poc

Proof-of-concept explorations for LTI 1.3 integration

# Local Moodle Setup

These explorations can be tested using a local Dockerized version of Moodle.  To setup Moodle follow the
[Quick Start](https://github.com/moodlehq/moodle-docker?tab=readme-ov-file#quick-start) instructions.

For the `MOODLE_BRANCH` use `MOODLE_500_STABLE`.

After the `cp config.docker-template.php $MOODLE_DOCKER_WWWROOT/config.php step` you'll need to do the following:

1. Run `export MOODLE_DOCKER_WEB_HOST=127.0.0.1` (this is needed to override localhost as the ltijs tries to connect on all interfaces if set to localhost)
2. Then run `bin/moodle-docker-compose up`. (don't add the -d so that you can ctrl+c to stop it)  Once it stabilizes, you can load https://127.0.0.1:8000 into your browser and you should see the Moodle homepage where you will need to run several automated steps to complete the installation.

NOTE: The compose file is pretty heavy and is slow to initially setup as it includes testing tools like Selenium.

# Docker Compose File

The docker-compose.yml file is meant for development only.  It runs the following services:

- Mysql (v8, exposed locally on port 33306)
