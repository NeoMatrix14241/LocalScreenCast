# Screen Mirror - PC-to-PC Sharing over LAN

A simple, browser-based screen sharing solution that allows one PC to stream its screen and audio to another PC over a local network. Works exactly like Teams screen sharing (without the remote control).

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/7e163620-7e38-4378-9309-bc71edf9353f" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/7f8984b3-1fae-4078-890c-b3264519ecc1" />

## Requirements

- **Node.js** (v24 LTS) - [Download](https://nodejs.org/)
- **mkcert** - [Download](https://github.com/FiloSottile/mkcert)
- **Modern browser** on both PCs (Chrome, Edge, Firefox, Brave Tested)
- **Same local network** (LAN/WLAN)

## Building
```bash
# With coturn precompiled windows binary (recommended):
npm run build:coturn

# With Node-Turn (Node.js library):
npm run build:nodejs

# Build both with Coturn and Node-Turn
npm run build:nodeturn && npm run build:coturn
```
The build will generate here:
/dist/LocalScreenCast.exe

## Installation & Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/NeoMatrix14241/LocalScreenCast.git
cd LocalScreenCast
```

### Setp 2: Create local certificate
``` bash
mkcert -install
mkcert -key-file key.pem -cert-file cert.pem <Your IPv4> localhost
```

### Step 3: Firewall Configuration
Open the UDP port range (**49152–65535**) to allow streaming.

#### Windows (Run Command Prompt as Administrator)
```cmd
netsh advfirewall firewall add rule name="Allow UDP 49152-65535" dir=in action=allow protocol=UDP localport=49152-65535
```

#### Linux (Ubuntu / Debian)
```bash
sudo ufw allow 49152:65535/udp
```

#### Linux (CentOS / RHEL)
```bash
sudo firewall-cmd --add-port=49152-65535/udp --permanent
sudo firewall-cmd --reload
```

#### General Linux (iptables)
```bash
sudo iptables -A INPUT -p udp --dport 49152:65535 -j ACCEPT
```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Start the Server

```bash
# With coturn precompiled windows binary (recommended):
npm run start:coturn

# With Node-Turn (Node.js library):
npm run start:nodejs
```

## Usage

#### Note: You can deploy this on a separate server within the LAN, it will still work if you are in the same network.

            +---------------------------------+
            |           SERVER PC             |
            |  +---------------------------+  |
            |  |  Screen Sharing Service   |  |
            |  |        (Signaling)        |  |
            |  +-------------+-------------+  |
            |                |                |
            |  +-------------+-------------+  |
            |  |        TURN Server        |  |
            |  |          (Relay)          |  |
            |  +-------------+-------------+  |
            +-------^-----------------^-------+
                    | (1)             | (1)
         (1) Signaling       (1) Signaling
                    |                 |
    +---------------+-------+ +-------+---------------+
    |    Broadcasting PC    | |       Viewer PC       |
    | (Sends Video Stream)  | | (Receives Video Stream) |
    +---------------+-------+ +-------+---------------+
                    |                 |
                    +------>(2)------>+
                       Direct P2P? 
                    |                 |
                    +------>(3)------>+
                      Relay via Local
                        TURN Server

    If P2P Failed and can't reach the other PC through LAN,
    a local TURN Server will be used to forward stream via UDP.

### PC1 (Broadcaster) - Sharing Screen

1. On PC1, open browser and go to: `http://<IPv4>:3000/broadcaster.html`
2. You'll see a random Room ID generated (e.g., `room-abc123def`)
3. Click **"Start Broadcasting"**
4. Grant browser permissions for:
   - Screen capture
   - Audio capture (microphone)
5. Share the Room ID or link with PC2

### PC2 (Viewer) - Watching Screen

1. On PC2, open browser and go to: `http://<IPv4>:3000/viewer.html`
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

## Troubleshooting

### Can't connect from another PC
- Ensure both PCs are on same network (WiFi/LAN)
- Check firewall isn't blocking UDP Port 49152-65535

### No audio
- Grant microphone permission in browser
- Check browser audio permissions in settings
- Ensure speakers/headphones are connected on viewer PC

### Screen won't share
- Grant screen capture permission when prompted
- Close other screen-sharing apps that might conflict

### Laggy/Stuttering
- Check network connection quality
- Reduce other network usage
- Broadcaster and viewer should be on same WiFi/LAN

## Security Notes

⚠️ This solution is designed for **local networks only**. For internet use:
- Add authentication/PIN system
- Use proper HTTPS/WSS (encrypted)
- Add Cloud-based TURN servers for better NAT traversal
- Consider VPN tunnel

## License

MIT License - Free to use and modify (Need help please, too many bugs, not a dev/programmer)

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify both PCs are on same network
3. Try restarting the server
4. Clear browser cache and cookies

---

**Made for simple, easy screen sharing over local networks.** 🚀

