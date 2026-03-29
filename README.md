# SWYFT Link

Browser-based interface for SWYFT Robotics devices — motor controllers, sensors, and more.  
No installation required. Works in Chrome, Edge, and Opera via the **WebSerial API**.

## Live App

🌐 **[https://swyft-robotics.github.io/swyft-link-web/](https://swyft-robotics.github.io/swyft-link-web/)**

## Compatible Devices

- ⚡ **SWYFT Thunder** — Brushless motor controller
- 🔧 More SWYFT sensors and devices coming soon

## Features

- 🔌 Direct USB connection — no drivers, no install, just plug in and open the URL
- ⚡ Real-time device status (voltage, temperature, speed, position, current)
- 🎛 Motor control with live sliders (Current / Speed / Position / T-Curve)
- 📡 FRC CAN Bus status and robot enable state
- 🔧 Firmware information
- 📋 Live log console with quick commands
- Works on **Windows, Mac, Linux, ChromeOS** — anything with a Chromium browser

## Browser Support

| Browser | Supported |
|---------|-----------|
| Chrome 89+ | ✅ |
| Edge 89+ | ✅ |
| Opera 75+ | ✅ |
| Firefox | ❌ (WebSerial not yet supported) |
| Safari | ❌ (WebSerial not yet supported) |

## How to Use

1. Plug your SWYFT device in via USB-C
2. Open the app in Chrome or Edge
3. Click **Connect Device** and select the COM port
4. Done!

## Development

```bash
npm install
npm run dev
```

## Deployment

Every push to `main` auto-deploys via GitHub Actions to GitHub Pages.

```bash
npm run build   # builds to dist/
```
