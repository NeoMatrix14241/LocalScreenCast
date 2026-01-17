const roomIdInput = document.getElementById('roomId');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const statusText = document.getElementById('statusText');
const shareLink = document.getElementById('shareLink');
const viewersList = document.getElementById('viewersList');
const viewersContainer = document.getElementById('viewersContainer');
const localPreview = document.getElementById('localPreview');
const previewPlaceholder = document.getElementById('previewPlaceholder');

let ws;
let peerConnections = new Map();
let roomId;
let mediaStream;
let isStreaming = false;

// Generate room ID if empty
if (!roomIdInput.value) {
    roomIdInput.value = 'room-' + Math.random().toString(36).substr(2, 9);
}

function updateStatus(message, type) {
    statusText.textContent = message;
    status.className = `status ${type}`;
}

function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            updateStatus('Connected to server', 'connected');
            resolve();
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleSignalingMessage(data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus('Connection error', 'disconnected');
            reject(error);
        };

        ws.onclose = () => {
            console.log('WebSocket closed');
            updateStatus('Disconnected from server', 'disconnected');
        };
    });
}

async function startBroadcasting() {
    try {
        roomId = roomIdInput.value.trim();
        if (!roomId) {
            alert('Please enter a Room ID');
            return;
        }

        console.log('🎬 Starting broadcast for room:', roomId);
        updateStatus('Requesting screen & audio...', 'connecting');

        // Capture screen with audio
        console.log('📷 Requesting display media...');

        // Try with audio first, fall back to video only
        try {
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    width: { ideal: 3840 },  // 4K resolution
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }  // 60 FPS for smooth motion
                },
                audio: {
                    echoCancellation: false,      // Preserve full audio quality
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: { ideal: 48000 }  // High sample rate
                }
            });
        } catch (error) {
            // If audio fails with these constraints, try video only
            console.warn('⚠️  Audio capture failed, trying video only:', error.message);
            mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    width: { ideal: 3840 },
                    height: { ideal: 2160 },
                    frameRate: { ideal: 60 }
                }
            });
        }

        console.log('✓ Display media captured');
        console.log('  Tracks:', mediaStream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));

        // Show local preview
        console.log('📹 Attaching to local preview...');
        localPreview.srcObject = mediaStream;
        localPreview.style.display = 'block';
        previewPlaceholder.style.display = 'none';
        console.log('✓ Local preview visible');

        // Connect WebSocket if not already connected
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.log('📡 Connecting WebSocket...');
            await connectWebSocket();
        }

        // Join room as broadcaster
        const clientId = 'broadcaster-' + Date.now();
        console.log('🚀 Joining room as broadcaster:', clientId);
        ws.send(JSON.stringify({
            type: 'join',
            roomId: roomId,
            role: 'broadcaster',
            clientId: clientId
        }));

        isStreaming = true;
        updateStatus('Broadcasting started', 'streaming');
        startBtn.disabled = true;
        stopBtn.disabled = false;
        roomIdInput.disabled = true;

        // Update share link
        const viewerUrl = `${window.location.origin}/viewer.html?room=${encodeURIComponent(roomId)}`;
        shareLink.textContent = viewerUrl;
        console.log('📤 Share URL:', viewerUrl);

        // Handle stream end
        mediaStream.getTracks().forEach(track => {
            track.onended = () => {
                console.log('⚠️  Stream track ended:', track.kind);
                stopBroadcasting();
            };
        });

    } catch (error) {
        console.error('❌ Broadcast error:', error);
        console.error('   Name:', error.name);
        console.error('   Message:', error.message);

        if (error.name === 'NotAllowedError') {
            updateStatus('Permission denied - screen capture cancelled', 'disconnected');
            console.log('User cancelled screen capture');
        } else if (error.name === 'NotFoundError') {
            updateStatus('No display found to capture', 'disconnected');
        } else if (error.name === 'NotSupportedError') {
            updateStatus('Screen capture not supported in this browser', 'disconnected');
        } else {
            updateStatus('Error: ' + error.message, 'disconnected');
        }
    }
}

function stopBroadcasting() {
    isStreaming = false;

    // Stop all tracks
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    // Hide local preview
    localPreview.srcObject = null;
    localPreview.style.display = 'none';
    previewPlaceholder.style.display = 'flex';

    // Close peer connections
    peerConnections.forEach(pc => {
        pc.close();
    });
    peerConnections.clear();

    updateStatus('Broadcasting stopped', 'disconnected');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    roomIdInput.disabled = false;
    viewersList.style.display = 'none';
    viewersContainer.innerHTML = '';
}

function handleSignalingMessage(data) {
    if (data.type === 'joined') {
        console.log('Joined as broadcaster');
    } else if (data.type === 'viewer-connected') {
        console.log('Viewer connected:', data.viewerId);
        createPeerConnection(data.viewerId);
        updateViewersList();
    } else if (data.type === 'viewer-disconnected') {
        console.log('Viewer disconnected');
        if (peerConnections.has(data.viewerId)) {
            peerConnections.get(data.viewerId).close();
            peerConnections.delete(data.viewerId);
        }
        updateViewersList();
    } else if (data.type === 'answer') {
        console.log('📥 Received ANSWER from viewer:', data.viewerId);
        const pc = peerConnections.get(data.viewerId);
        if (pc) {
            console.log('⚙️  Setting remote description (answer)...');
            pc.setRemoteDescription(new RTCSessionDescription(data.answer)).then(() => {
                console.log('✓ Remote description set successfully');
            }).catch(e => {
                console.error('❌ Error setting remote description:', e);
            });
        } else {
            console.error('❌ No peer connection found for viewer:', data.viewerId);
        }
    } else if (data.type === 'ice-candidate') {
        const pc = peerConnections.get(data.viewerId);
        if (pc && data.candidate) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error('Error adding ICE candidate:', e));
        }
    }
}

async function createPeerConnection(viewerId) {
    try {
        console.log('🔌 Creating peer connection for viewer:', viewerId);

        /**
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: ['stun:stun.l.google.com:19302'] },
                { urls: ['stun:stun1.l.google.com:19302'] },
                { urls: ['stun:stun2.l.google.com:19302'] },
                { urls: ['stun:stun3.l.google.com:19302'] },
                { urls: ['stun:stun4.l.google.com:19302'] },
                { urls: ['stun:stun.stunprotocol.org:3478'] },
                // Public TURN servers for cross-network fallback
                { 
                    urls: ['turn:openrelay.metered.ca:80'],
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { 
                    urls: ['turn:openrelay.metered.ca:443'],
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        });
        **/

        /** TURN-only configuration for testing
         const pc = new RTCPeerConnection({
             iceServers: [
                 {
                     urls: [
                         'turn:openrelay.metered.ca:80',
                         'turn:openrelay.metered.ca:443',
                         'turn:openrelay.metered.ca:443?transport=tcp'
                     ],
                     username: 'openrelayproject',
                     credential: 'openrelayproject'
                 }
             ],
             iceTransportPolicy: 'relay'  // ← Forces TURN only
         });
         **/

        // Get your TURN server IP (same machine or another on LAN)
        const TURN_SERVER_IP = '192.168.160.48';  // ← Your TURN server IP

        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: `turn:${TURN_SERVER_IP}:3478`,
                    username: 'username',
                    credential: 'password123'
                }
            ],
            iceTransportPolicy: "all"
        });

        peerConnections.set(viewerId, pc);

        // Add media tracks
        if (mediaStream) {
            console.log('📹 Adding tracks to peer connection:');
            const tracks = mediaStream.getTracks();
            console.log(`   Total tracks: ${tracks.length}`);

            tracks.forEach((track, idx) => {
                console.log(`   ✓ Track ${idx}: ${track.kind} (${track.enabled ? 'enabled' : 'disabled'}) - readyState: ${track.readyState}`);

                // Monitor video track specifically
                if (track.kind === 'video') {
                    console.log(`      Video track settings:`, track.getSettings());

                    // Keep video track unmuted at all times
                    track.onmute = () => {
                        console.warn('⚠️  Video track muted, re-enabling...');
                        track.enabled = true;  // Force it back on
                    };
                    track.onunmute = () => console.log('✓ Video track unmuted');
                    track.onended = () => console.error('❌ VIDEO TRACK ENDED!');

                    // Ensure track stays enabled
                    setInterval(() => {
                        if (!track.enabled) {
                            console.warn('⚠️  Video track disabled, re-enabling...');
                            track.enabled = true;
                        }
                        if (track.readyState !== 'live') {
                            console.error(`⚠️  Video track state: ${track.readyState}`);
                        }
                    }, 1000);
                }

                try {
                    // Use addTrack with the stream - this is the correct way for display media
                    const sender = pc.addTrack(track, mediaStream);
                    console.log(`     ✅ Sender added: ${sender.track.id}`);
                } catch (e) {
                    console.error(`   Error adding track:`, e.message);
                }
            });
            console.log('✓ All tracks added successfully');
        } else {
            console.error('❌ No media stream available!');
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📤 Broadcaster sending ICE candidate');
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    roomId: roomId,
                    to: 'viewer',
                    viewerId: viewerId,
                    candidate: event.candidate
                }));
            }
        };

        // Create and send offer
        console.log('📋 Creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('✓ Offer created and set as local description');

        // Set high bitrate for maximum quality
        const senders = pc.getSenders();
        for (const sender of senders) {
            if (sender.track) {
                const params = sender.getParameters();
                if (!params.encodings) {
                    params.encodings = [{}];
                }
                if (sender.track.kind === 'video') {
                    params.encodings[0].maxBitrate = 100000000; // 5 Mbps for video
                    console.log('📹 Video bitrate set to 5 Mbps');
                } else if (sender.track.kind === 'audio') {
                    params.encodings[0].maxBitrate = 320000; // 320 kbps for audio
                    console.log('🔊 Audio bitrate set to 320 kbps');
                }
                await sender.setParameters(params);
            }
        }

        console.log('📤 Sending offer to viewer...');
        ws.send(JSON.stringify({
            type: 'offer',
            roomId: roomId,
            to: 'viewer',
            viewerId: viewerId,
            offer: offer
        }));
        console.log('✓ Offer sent');

        pc.onconnectionstatechange = () => {
            console.log('🔗 Broadcaster peer connection state:', pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
                console.log('Removing viewer from connections');
                peerConnections.delete(viewerId);
                updateViewersList();
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('🧊 Broadcaster ICE connection state:', pc.iceConnectionState);
        };

        // Monitor WebRTC stats to see if data is flowing
        let statsInterval = setInterval(async () => {
            if (!pc) {
                clearInterval(statsInterval);
                return;
            }
            console.log(`[STATS] Connection state: ${pc.connectionState}, ICE state: ${pc.iceConnectionState}`);

            if (pc && (pc.connectionState === 'connected' || pc.connectionState === 'connecting')) {
                try {
                    const stats = await pc.getStats();
                    stats.forEach(report => {
                        if (report.type === 'outbound-rtp') {
                            if (report.kind === 'video') {
                                console.log(`📊 Video sent: ${report.bytesSent} bytes, ${report.framesEncoded} frames`);
                            }
                            if (report.kind === 'audio') {
                                console.log(`📊 Audio sent: ${report.bytesSent} bytes`);
                            }
                        }
                        if (report.type === 'inbound-rtp') {
                            if (report.kind === 'video') {
                                console.log(`📊 Video received: ${report.bytesReceived} bytes`);
                            }
                        }
                    });
                } catch (e) {
                    console.error('Error getting stats:', e.message);
                }
            }
        }, 2000);

    } catch (error) {
        console.error('Error creating peer connection:', error);
    }
}

function updateViewersList() {
    if (peerConnections.size > 0) {
        viewersList.style.display = 'block';
        viewersContainer.innerHTML = '';
        peerConnections.forEach((pc, viewerId) => {
            const state = pc.connectionState;
            let stateColor = '#ffc107';
            if (state === 'connected') stateColor = '#28a745';

            const item = document.createElement('div');
            item.className = 'viewer-item';
            item.innerHTML = `
                        ${viewerId}
                        <span class="badge" style="background: ${stateColor}">${state}</span>
                    `;
            viewersContainer.appendChild(item);
        });
    } else {
        viewersList.style.display = 'none';
    }
}

startBtn.addEventListener('click', startBroadcasting);
stopBtn.addEventListener('click', stopBroadcasting);

// Generate random room ID on load
roomIdInput.value = 'room-' + Math.random().toString(36).substr(2, 9);