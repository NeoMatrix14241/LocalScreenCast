# Screen Mirror - PC-to-PC Sharing over LAN

A simple, browser-based screen sharing solution that allows one PC to stream its screen and audio to another PC over a local network. Works exactly like Teams screen sharing.

## Features

✓ Real-time screen sharing with audio
✓ Works over LAN/WiFi  
✓ Browser-based (Chrome, Edge, Firefox)
✓ Multiple viewers can connect to one broadcaster
✓ No login or authentication required
✓ Simple room-based pairing system
✓ Low latency streaming using WebRTC
✓ Works on Windows, Mac, and Linux

## Requirements

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **Modern browser** on both PCs (Chrome, Edge, Firefox recommended)
- **Same local network** (LAN or WiFi)

## Installation & Setup

### Step 1: Install Dependencies

```bash
cd screencast
npm install
```

This installs:
- `express` - Web server
- `ws` - WebSocket for signaling
- `cors` - Cross-origin support

### Step 2: Start the Server

```bash
npm start
```

You should see:
```
✓ Server running on ws://localhost:3000
✓ Broadcaster: http://localhost:3000/broadcaster.html
✓ Viewer: http://localhost:3000/viewer.html
```

## Usage

### PC1 (Broadcaster) - Sharing Screen

1. On PC1, open browser and go to: `http://localhost:3000/broadcaster.html`
2. You'll see a random Room ID generated (e.g., `room-abc123def`)
3. Click **"Start Broadcasting"**
4. Grant browser permissions for:
   - Screen capture
   - Audio capture (microphone)
5. Share the Room ID or link with PC2

### PC2 (Viewer) - Watching Screen

1. On PC2, open browser and go to: `http://localhost:3000/viewer.html`
2. Enter the Room ID from PC1
3. Click **"Connect"**
4. You'll see PC1's screen and hear the audio in real-time

## Accessing from Another PC on Network

If server is on PC at IP `192.168.1.100`:

**PC1 (Broadcaster):**
```
http://192.168.1.100:3000/broadcaster.html
```

**PC2 (Viewer):**
```
http://192.168.1.100:3000/viewer.html
```

Find your PC's IP:
- **Windows (PowerShell):** `ipconfig` → Look for IPv4 Address
- **Mac/Linux (Terminal):** `ifconfig` or `hostname -I`

## API Reference

### WebSocket Messages

#### Broadcaster
- **join** - Connect as broadcaster to a room
- **offer** - Send WebRTC offer to viewer
- **ice-candidate** - Send ICE candidate for NAT traversal
- **answer** (received) - Get answer from viewer

#### Viewer
- **join** - Connect as viewer to a room
- **answer** - Send WebRTC answer to broadcaster
- **ice-candidate** - Send ICE candidate
- **offer** (received) - Get offer from broadcaster

### Server Events

```javascript
// Message types
'join'                    // User joins room
'offer'                   // WebRTC offer for peer connection
'answer'                  // WebRTC answer for peer connection
'ice-candidate'           // ICE candidate for NAT traversal
'viewer-connected'        // Notifies broadcaster of new viewer
'viewer-disconnected'     // Notifies broadcaster viewer left
'broadcaster-disconnected' // Notifies viewers broadcast ended
```

## Troubleshooting

### Can't connect from another PC
- Ensure both PCs are on same network (WiFi/LAN)
- Check firewall isn't blocking port 3000
- Use the server PC's IP address (not localhost)

### No audio
- Grant microphone permission in browser
- Check browser audio permissions in settings
- Ensure speakers/headphones are connected on viewer PC

### Screen won't share
- Grant screen capture permission when prompted
- Try a different browser
- Close other screen-sharing apps that might conflict

### Laggy/Stuttering
- Check network connection quality
- Reduce other network usage
- Broadcaster and viewer should be on same WiFi/LAN
- Try HDMI/wired connection if possible

## Project Structure

```
screencast/
├── server.js              # Main server file
├── package.json           # Dependencies
├── public/
│   ├── index.html        # Home page
│   ├── broadcaster.html  # PC1 screen share interface
│   └── viewer.html       # PC2 viewing interface
└── README.md             # This file
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Central Server                            │
│  - WebSocket Signaling                                       │
│  - Room Management                                           │
│  - Peer Connection Coordination                              │
└──────────────────────────────────────────────────────────────┘
         ↑                                    ↑
    WebSocket                          WebSocket
    Signaling                          Signaling
         ↓                                    ↓
┌──────────────────────────┐      ┌──────────────────────────┐
│ PC1 - Broadcaster         │      │ PC2 - Viewer              │
│                           │      │                           │
│ - Captures Screen         │      │ - Receives Stream         │
│ - Captures Audio          │      │ - Plays Screen            │
│ - Creates WebRTC Offer    │      │ - Creates WebRTC Answer   │
│ - Sends Media Tracks      │━━━━━━│ - Receives Media Tracks   │
│                           │      │                           │
│  (Direct Peer to Peer)    │      │  (Direct Peer to Peer)    │
│   WebRTC Data Connection  │      │   WebRTC Data Connection  │
└──────────────────────────┘      └──────────────────────────┘
```

## How It Works

1. **Signaling**: Server facilitates connection setup via WebSocket
2. **WebRTC Offer/Answer**: PCs exchange connection details
3. **ICE Candidates**: Network path negotiation through firewall
4. **Media Streaming**: Once connected, audio/video stream directly between PCs
5. **Low Latency**: Direct P2P connection provides minimal delay

## Verification Code

Use this simple code to verify server is running:

```html
<!-- Test page: http://localhost:3000/test.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Server Status</title>
</head>
<body>
    <h1>Server is running ✓</h1>
    <p>WebSocket Server: <strong>Connected</strong></p>
    <p id="time"></p>
    <script>
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}`);
        ws.onopen = () => {
            document.getElementById('time').innerHTML = 'Status: Ready ✓';
            console.log('✓ Server connection verified');
        };
    </script>
</body>
</html>
```

## Security Notes

⚠️ This solution is designed for **local networks only**. For internet use:
- Add authentication/PIN system
- Use HTTPS/WSS (encrypted)
- Add TURN servers for better NAT traversal
- Consider VPN tunnel

## Performance Tips

- Keep broadcaster and viewer on same WiFi band (2.4GHz or 5GHz)
- Close other bandwidth-consuming apps
- Use wired Ethernet for best performance
- Test with smaller window sizes first

## Future Enhancements

- [ ] Pause/Resume streaming
- [ ] Recording capability
- [ ] Multiple broadcast management
- [ ] Connection quality stats display
- [ ] Mobile device support improvements
- [ ] Chat functionality

## License

MIT License - Free to use and modify

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify both PCs are on same network
3. Try restarting the server
4. Clear browser cache and cookies

---

**Made for simple, easy screen sharing over local networks.** 🚀
