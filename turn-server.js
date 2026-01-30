const os = require('os');

const Turn = require('node-turn');

const server = new Turn({
  // Listening settings
  listeningPort: 3478,
  listeningIps: ['0.0.0.0'],

  // Relay settings
  relayIps: ['0.0.0.0'],
  externalIps: ['0.0.0.0'],

  // Min/Max ports for relay
  minPort: 49152,
  maxPort: 65535,

  // Authentication
  authMech: 'long-term',
  credentials: {
    "username": "password123"
  },

  // Realm
  realm: 'myturn',

  // Debug
  debugLevel: 'ALL'
});

server.start();

console.log('🚀 TURN Server started on port 3478');
console.log(`📍 Relay IP: ${getLocalIP()}`);
console.log('👤 Credentials: username / password123');
