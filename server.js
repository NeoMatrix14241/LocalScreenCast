const express = require('express');
const https = require('https');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();

// Load certificate
const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');

let server;
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  server = https.createServer(options, app);
  console.log('✓ HTTPS enabled');
} else {
  server = require('http').createServer(app);
  console.log('⚠️  No certificates found. Using HTTP (getDisplayMedia may not work)');
}

function startListening() {
  const wss = new WebSocket.Server({ server });

  // Enable CORS
  app.use(cors());

  // Security headers for media device access
  app.use((req, res, next) => {
    // Allow media device access
    res.header('Permissions-Policy', 'camera=*, microphone=*, display-capture=*');
    res.header('Cross-Origin-Embedder-Policy', 'require-corp');
    res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
  });

  app.use(express.static('public'));

  // Debug middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Store connections
  const rooms = new Map();

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'join') {
          // PC1 (broadcaster) or PC2 (viewer) joins a room
          const roomId = data.roomId;
          const role = data.role; // 'broadcaster' or 'viewer'

          if (!rooms.has(roomId)) {
            rooms.set(roomId, { broadcaster: null, viewers: [] });
          }

          const room = rooms.get(roomId);

          if (role === 'broadcaster') {
            room.broadcaster = { ws, id: data.clientId };
            console.log(`Broadcaster joined room: ${roomId}`);
            ws.send(JSON.stringify({ type: 'joined', role: 'broadcaster' }));
          } else if (role === 'viewer') {
            room.viewers.push({ ws, id: data.clientId });
            console.log(`Viewer joined room: ${roomId}`);
            ws.send(JSON.stringify({ type: 'joined', role: 'viewer' }));
            
            // Notify broadcaster that a viewer connected
            if (room.broadcaster) {
              room.broadcaster.ws.send(JSON.stringify({
                type: 'viewer-connected',
                viewerId: data.clientId
              }));
            }
          }
        } else if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice-candidate') {
          // Relay WebRTC signaling messages
          const roomId = data.roomId;
          const room = rooms.get(roomId);

          console.log(`[SIGNAL] ${data.type} from ${data.to ? 'unknown' : 'client'} in room ${roomId}`);

          if (!room) {
            console.error(`[ERROR] Room not found: ${roomId}`);
            return;
          }

          if (data.to === 'broadcaster' && room.broadcaster) {
            console.log(`[SIGNAL] Forwarding ${data.type} to broadcaster`);
            room.broadcaster.ws.send(JSON.stringify(data));
          } else if (data.to === 'viewer') {
            const viewer = room.viewers.find(v => v.id === data.viewerId);
            if (viewer) {
              console.log(`[SIGNAL] Forwarding ${data.type} to viewer ${data.viewerId}`);
              viewer.ws.send(JSON.stringify(data));
            } else {
              console.error(`[ERROR] Viewer not found: ${data.viewerId}`);
            }
          }
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      
      // Clean up rooms
      for (const [roomId, room] of rooms) {
        if (room.broadcaster && room.broadcaster.ws === ws) {
          room.broadcaster = null;
          // Notify all viewers
          room.viewers.forEach(viewer => {
            viewer.ws.send(JSON.stringify({ type: 'broadcaster-disconnected' }));
          });
        } else {
          room.viewers = room.viewers.filter(v => v.ws !== ws);
          // Notify broadcaster
          if (room.broadcaster) {
            room.broadcaster.ws.send(JSON.stringify({
              type: 'viewer-disconnected',
              viewerId: ws.clientId
            }));
          }
        }
        
        if (!room.broadcaster && room.viewers.length === 0) {
          rooms.delete(roomId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    let ipAddress = 'localhost';
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddress = iface.address;
          break;
        }
      }
    }

    console.log('\n====================================');
    console.log('✓ Screen Mirror Server Running');
    console.log('====================================');
    console.log(`Port: ${PORT}`);
    console.log(`Local: https://localhost:${PORT}`);
    console.log(`Network: https://${ipAddress}:${PORT}`);
    console.log('');
    console.log('PC1 (Broadcaster): https://localhost:3000/broadcaster.html');
    console.log('PC2 (Viewer):      https://192.168.160.48:3000/viewer.html');
    console.log('');
    console.log('PC1 (Broadcaster): /broadcaster.html');
    console.log('PC2 (Viewer):      /viewer.html');
    console.log('Home:              /');
    console.log('====================================\n');
  });
}

startListening();
