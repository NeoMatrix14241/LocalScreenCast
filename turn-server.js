const Turn = require('node-turn');

const server = new Turn({
    // Listening settings
    listeningPort: 3478,
    listeningIps: ['0.0.0.0'],
    
    // Relay settings
    relayIps: ['192.168.160.48'],  // ← Your PC's LAN IP
    externalIps: ['192.168.160.48'],
    
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
console.log('📍 Relay IP: 192.168.160.48');
console.log('👤 Credentials: username / password123');