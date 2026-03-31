# SWYFT Link

> Professional browser-based device interface for SWYFT Robotics hardware.

## 🌐 Live App

**[https://proofshift.github.io/Swyft-dev-app/](https://proofshift.github.io/Swyft-dev-app/)**

No installation required — just open the link in Chrome or Edge and plug in your device.

---

## Compatible Devices

| Device | Description |
|--------|-------------|
| ⚡ **SWYFT Thunder** | Brushless FOC motor controller for FRC robotics |
| 🔬 **SWYFT DEV Sensor** | Multi-sensor board (MT6701, AS5600, LSM6DSO IMU, NTC, ADC) |

---

## Features

- **Sidebar navigation** — collapsible, device-aware layout
- **Dashboard** — real-time overview of all sensors at a glance
- **Sensors tab** — live circular gauges, angle displays, IMU bars and 3D orientation
- **Graphs tab** — canvas-based real-time charts (zero lag), pause/resume, adjustable window
- **Firmware tab** — one-click OTA update via WebUSB, no tools needed
- **Console tab** — full serial terminal with quick commands
- **Documentation** — built-in reference for encoders, IMU, firmware, serial protocol and troubleshooting
- Works on **Windows, Mac, Linux, ChromeOS** — any Chromium-based browser

---

## Browser Requirements

| Browser | WebSerial | WebUSB (DFU flash) |
|---------|-----------|-------------------|
| Chrome 89+ | ✅ | ✅ |
| Edge 89+ | ✅ | ✅ |
| Firefox | ❌ | ❌ |
| Safari | ❌ | ❌ |

---

## Hardware — SWYFT DEV Sensor

| Sensor | Interface | Resolution |
|--------|-----------|------------|
| MT6701 magnetic encoder | ABZ / SSI | 14-bit (16384 cpr) |
| AS5600 magnetic encoder | I²C | 12-bit (4096 cpr) |
| LSM6DSO 6-axis IMU | SPI/I²C | ±16g / ±2000 dps |
| NTC thermistor | ADC | −40 to +125 °C |
| Supply voltage monitor | ADC | 0–5V |
| Magnetic limit switch | I²C | Detect/clear |

---

## Run Locally

```bash
git clone https://github.com/proofshift/Swyft-dev-app.git
cd Swyft-dev-app
npm install
npm run dev
```

Or build for production:

```bash
npm run build
npx serve dist
```

Node.js 18+ required.

---

## Firmware Updates

Firmware `.bin` files are bundled in `public/firmware/`. The Firmware tab in the app handles flashing automatically via WebUSB — no STM32CubeProgrammer or drivers needed.

---

## Deployment

Pushing to `main` automatically builds and deploys to GitHub Pages via GitHub Actions.

---

Built by [SWYFT Robotics](https://swyftrobotics.com)
