# QUICK START GUIDE - Screen Mirror

## Prerequisites
Before starting, make sure you have Node.js installed:
- Download from: https://nodejs.org/ (LTS recommended)
- Install it with default settings
- Close and reopen your terminal after installation

## Quick Start (Windows)

### Option 1: Double-click (Easiest)
1. Double-click `start-server.bat` in the screencast folder
2. First run will install dependencies automatically
3. Wait for "Server is running!" message
4. Open browser to http://localhost:3000/

### Option 2: PowerShell/Command Prompt
```powershell
cd C:\Users\kyle.capistrano\Desktop\screencast
npm install
npm start
```

## Quick Start (Mac/Linux)

```bash
cd ~/Desktop/screencast
chmod +x start-server.sh
./start-server.sh
```

## Usage

### On PC1 (Broadcasting)
1. Open: http://localhost:3000/broadcaster.html
2. Click "Start Broadcasting"
3. Grant permissions for screen & audio
4. Copy the Room ID or share the link

### On PC2 (Viewing)
1. Open: http://localhost:3000/viewer.html
2. Enter the Room ID from PC1
3. Click "Connect"
4. You should see PC1's screen!

## Accessing from Other PCs

If server is on a PC at IP address `192.168.1.100`:

Broadcaster URL: `http://192.168.1.100:3000/broadcaster.html`
Viewer URL: `http://192.168.1.100:3000/viewer.html`

### Find your PC's IP:
- **Windows**: Open PowerShell, type `ipconfig`, look for "IPv4 Address"
- **Mac**: Open Terminal, type `ifconfig`, look for "inet" under your WiFi adapter
- **Linux**: Open Terminal, type `hostname -I`

## Verification

The server is working correctly if:
- ✓ Console shows "Server running on ws://localhost:3000"
- ✓ You can open http://localhost:3000/ in browser
- ✓ Broadcaster page shows status "Not connected"
- ✓ Viewer page loads with connection modal

## Common Issues

**"Node.js not found"**
- Install Node.js from https://nodejs.org/
- Restart your terminal after install

**"Port 3000 already in use"**
- Another app is using port 3000
- Stop that app or modify server.js (change 3000 to 3001, etc.)

**"Can't connect from another PC"**
- Make sure both PCs are on same network (WiFi or LAN)
- Check firewall isn't blocking port 3000
- Use the server PC's IP address (find with ipconfig/ifconfig)

**No audio**
- Grant microphone permission when prompted
- Check browser audio settings
- Ensure speakers connected on viewer PC

## Browser Compatibility

- ✓ Chrome (Recommended)
- ✓ Edge (Recommended)
- ✓ Firefox
- ✓ Safari (Mac/iOS)

## To Stop the Server

- Press `Ctrl + C` in the terminal

---

Need help? Check the full README.md for detailed documentation.
