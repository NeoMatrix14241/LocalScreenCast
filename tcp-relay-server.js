// TCP Relay Server (like TURN but TCP)
const WebSocket = require('ws');
const { RTCPeerConnection, RTCSessionDescription } = require('werift');

const wss = new WebSocket.Server({ port: 8080 });
console.log('🚀 TCP WebSocket WebRTC relay running on port 8080');

const clients = new Map(); // viewerId -> { ws, pc }

wss.on('connection', ws => {
    let viewerId = null;
    let pc = new RTCPeerConnection();

    pc.onTrack = track => {
        console.log(`🔹 Received ${track.kind} track from client`);
        // Echo track back for testing or relay
        pc.addTrack(track);
    };

    pc.onIceCandidate = candidate => {
        if (candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ candidate }));
        }
    };

    ws.on('message', async msg => {
        const data = JSON.parse(msg.toString());

        if (!viewerId && data.viewerId) viewerId = data.viewerId;

        if (data.type === 'offer') {
            console.log(`📋 Received offer from viewer ${viewerId}`);
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify(answer));
            clients.set(viewerId, { ws, pc });
        } else if (data.candidate) {
            try {
                await pc.addIceCandidate(data.candidate);
            } catch (e) {
                console.error('Error adding ICE candidate:', e.message);
            }
        }
    });

    ws.on('close', () => {
        console.log(`❌ Viewer ${viewerId} disconnected`);
        if (clients.has(viewerId)) {
            clients.delete(viewerId);
        }
        pc.close();
    });
});
