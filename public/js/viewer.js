const remoteVideo = document.getElementById('remoteVideo');
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const loadingScreen = document.getElementById('loadingScreen');
const inputModal = document.getElementById('inputModal');
const roomIdInput = document.getElementById('roomIdInput');
const connectBtn = document.getElementById('connectBtn');
const cancelBtn = document.getElementById('cancelBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const changeRoomBtn = document.getElementById('changeRoomBtn');
const connectionInfo = document.getElementById('connectionInfo');
const loadingSubtext = document.getElementById('loadingSubtext');

let ws;
let peerConnection;
let roomId;
let clientId = 'viewer-' + Date.now();

// Logging function
function log(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Get room ID from URL or show modal
function getInitialRoomId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
}

function updateStatus(message, type) {
    statusText.textContent = message;
    statusBadge.className = `status ${type}`;
}

function showRoomModal(message = 'Connect to Broadcaster') {
    loadingScreen.classList.add('hidden');
    inputModal.classList.remove('hidden');
    roomIdInput.focus();
}

function hideRoomModal() {
    inputModal.classList.add('hidden');
}

function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            resolve();
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleSignalingMessage(data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus('Connection error', 'disconnected');
            loadingSubtext.textContent = 'Error connecting to server';
            reject(error);
        };

        ws.onclose = () => {
            console.log('WebSocket closed');
            updateStatus('Disconnected', 'disconnected');
        };
    });
}

async function connectToRoom(room) {
    try {
        roomId = room.trim();
        if (!roomId) {
            alert('Please enter a Room ID');
            return;
        }

        hideRoomModal();
        loadingScreen.classList.remove('hidden');
        updateStatus('Connecting...', 'connecting');
        loadingSubtext.textContent = `Connecting to room: ${roomId}`;

        // Connect WebSocket if not already connected
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            await connectWebSocket();
        }

        // Join room as viewer
        ws.send(JSON.stringify({
            type: 'join',
            roomId: roomId,
            role: 'viewer',
            clientId: clientId
        }));

    } catch (error) {
        console.error('Error:', error);
        updateStatus('Connection failed', 'disconnected');
        loadingSubtext.textContent = 'Failed to connect. Check the Room ID.';
        setTimeout(() => showRoomModal(), 2000);
    }
}

function handleSignalingMessage(data) {
    if (data.type === 'joined') {
        console.log('Joined as viewer');
        updateStatus('Waiting for broadcast...', 'connecting');
        loadingSubtext.textContent = 'Waiting for broadcaster to connect...';
    } else if (data.type === 'offer') {
        console.log('Received offer from broadcaster');
        handleOffer(data.offer);
    } else if (data.type === 'ice-candidate') {
        console.log('Received ICE candidate');
        if (peerConnection && data.candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(e => console.error('Error adding ICE candidate:', e));
        }
    } else if (data.type === 'broadcaster-disconnected') {
        console.log('Broadcaster disconnected');
        disconnect('Broadcaster disconnected');
    }
}

async function handleOffer(offer) {
    try {
        // Create peer connection if needed
        if (!peerConnection) {
            createPeerConnection();
        }

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('✓ Remote description (offer) set');

        // Create and send answer
        console.log('📋 Creating answer...');
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('✓ Answer created and set as local description');

        console.log('📤 Sending answer to broadcaster...');
        ws.send(JSON.stringify({
            type: 'answer',
            roomId: roomId,
            to: 'broadcaster',
            viewerId: clientId,
            answer: answer
        }));
        console.log('✓ Answer sent');

    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

function createPeerConnection() {
    console.log('🔌 Creating RTCPeerConnection...');
    peerConnection = new RTCPeerConnection({
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
        ]
    });

    let streamAttached = false;

    // Handle remote stream - THIS IS CRITICAL
    peerConnection.ontrack = (event) => {
        console.log('🎬 *** ONTRACK FIRED! ***');
        console.log('   Track kind:', event.track.kind);
        console.log('   Track state:', event.track.readyState);
        console.log('   Streams count:', event.streams.length);

        if (event.streams && event.streams.length > 0) {
            const stream = event.streams[0];
            console.log('   Stream ID:', stream.id);
            console.log('   Stream active:', stream.active);
            console.log('   Stream tracks:', stream.getTracks().length);

            // Log detailed track info
            stream.getTracks().forEach((track, i) => {
                console.log(`   Track ${i}:`, track.kind, 'enabled:', track.enabled, 'readyState:', track.readyState);
                if (track.kind === 'video') {
                    const settings = track.getSettings ? track.getSettings() : {};
                    console.log(`      Video settings:`, settings);
                }
            });

            // Only attach stream once (ontrack fires for each track - audio and video)
            if (!streamAttached) {
                console.log('📌 Attaching stream to video element (first time)...');
                remoteVideo.srcObject = stream;
                streamAttached = true;

                // Set autoplay and playsinline
                remoteVideo.autoplay = true;
                remoteVideo.playsinline = true;

                // Attempt play immediately
                remoteVideo.play().then(() => {
                    console.log('✓ Video playing (autoplay succeeded)');
                }).catch(e => {
                    console.error('⚠️  Autoplay error:', e.message);
                });

                // Log video element state
                setTimeout(() => {
                    console.log('📺 Video element state after attach:');
                    console.log('   - videoWidth:', remoteVideo.videoWidth);
                    console.log('   - videoHeight:', remoteVideo.videoHeight);
                    console.log('   - paused:', remoteVideo.paused);
                    console.log('   - muted:', remoteVideo.muted);
                    console.log('   - readyState:', remoteVideo.readyState);
                    console.log('   - networkState:', remoteVideo.networkState);
                }, 1000);
            } else {
                console.log('   (Stream already attached, skipping duplicate)');
            }

            // Schedule a check to see video dimensions
            loadingScreen.classList.add('hidden');
            updateStatus('Connected', 'connected');
            connectionInfo.textContent = `Connected • ${roomId}`;
            log('✓ Remote stream received and attached to video element', 'success');
        } else {
            console.warn('⚠️  No streams in ontrack event!');
        }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('📤 Sending ICE candidate:', event.candidate.candidate.substring(0, 50));
            ws.send(JSON.stringify({
                type: 'ice-candidate',
                roomId: roomId,
                to: 'broadcaster',
                candidate: event.candidate
            }));
        }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Peer connection state:', peerConnection.connectionState);

        if (peerConnection.connectionState === 'failed') {
            console.error('❌ Connection failed');
            disconnect('Connection failed. Reconnecting...');
            setTimeout(() => connectToRoom(roomId), 2000);
        } else if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'disconnected') {
            console.log('Connection closed or disconnected');
        }
    };

    // Monitor WebRTC stats to see if data is flowing
    let statsInterval = setInterval(async () => {
        if (!peerConnection) {
            clearInterval(statsInterval);
            return;
        }
        console.log(`[STATS] Connection state: ${peerConnection.connectionState}, ICE state: ${peerConnection.iceConnectionState}`);

        if (peerConnection && (peerConnection.connectionState === 'connected' || peerConnection.connectionState === 'connecting')) {
            try {
                const stats = await peerConnection.getStats();
                stats.forEach(report => {
                    if (report.type === 'inbound-rtp') {
                        if (report.kind === 'video') {
                            console.log(`📊 Video received: ${report.bytesReceived} bytes, ${report.framesDecoded} frames decoded`);
                        }
                        if (report.kind === 'audio') {
                            console.log(`📊 Audio received: ${report.bytesReceived} bytes`);
                        }
                    }
                    if (report.type === 'outbound-rtp') {
                        if (report.kind === 'video') {
                            console.log(`📊 Video sent (viewer): ${report.bytesSent} bytes`);
                        }
                    }
                });
            } catch (e) {
                console.error('Error getting stats:', e.message);
            }
        }
    }, 2000);

    // Also monitor ICE connection state and get candidate details
    peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
    };

    // Monitor ICE candidates for debugging
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('📍 ICE candidate:', event.candidate.candidate);
        }
    };
}

function disconnect(reason = 'Disconnected') {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    remoteVideo.srcObject = null;
    loadingScreen.classList.remove('hidden');
    loadingSubtext.textContent = reason;
    updateStatus('Disconnected', 'disconnected');
    connectionInfo.textContent = 'Not connected';
}

// Event listeners
connectBtn.addEventListener('click', () => {
    const room = roomIdInput.value;
    if (room) {
        connectToRoom(room);
    }
});

roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const room = roomIdInput.value;
        if (room) {
            connectToRoom(room);
        }
    }
});

cancelBtn.addEventListener('click', () => {
    hideRoomModal();
    updateStatus('Ready to connect', 'disconnected');
});

disconnectBtn.addEventListener('click', () => {
    disconnect('Disconnected by user');
    showRoomModal();
});

changeRoomBtn.addEventListener('click', () => {
    disconnect('Changing room...');
    roomIdInput.value = '';
    showRoomModal();
});

// Fullscreen button
const fullscreenBtn = document.getElementById('fullscreenBtn');
const videoContainer = document.querySelector('.video-container');

fullscreenBtn.addEventListener('click', async () => {
    try {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (videoContainer.requestFullscreen) {
                await videoContainer.requestFullscreen();
            } else if (videoContainer.webkitRequestFullscreen) {
                videoContainer.webkitRequestFullscreen();
            } else if (videoContainer.mozRequestFullScreen) {
                videoContainer.mozRequestFullScreen();
            } else if (videoContainer.msRequestFullscreen) {
                videoContainer.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    } catch (err) {
        console.error('Fullscreen error:', err);
    }
});

// Initialize
const initialRoomId = getInitialRoomId();
if (initialRoomId) {
    roomIdInput.value = initialRoomId;
    connectToRoom(initialRoomId);
} else {
    showRoomModal();
}