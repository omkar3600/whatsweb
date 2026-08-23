const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/shops/me',
  method: 'GET',
  headers: {
    // We would need a valid token here to test it properly, but we don't have one.
    // Let's just write a generic nestjs script to see how ForbiddenException serializes.
  }
};
