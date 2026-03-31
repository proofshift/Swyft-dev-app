import { useState } from 'react'
import {
  BookOpen, Zap, Activity, Cpu, Terminal, AlertCircle,
  CheckCircle, ChevronRight, ExternalLink, Info, Radio,
  Gauge, TrendingUp, Usb, Wifi, Sliders, Settings
} from 'lucide-react'
import clsx from 'clsx'

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Section { id: string; title: string; icon: React.ElementType; color: string }

const SECTIONS: Section[] = [
  { id: 'quickstart',  title: 'Quick Start',           icon: Zap,         color: 'text-sky-400'    },
  { id: 'thunder',     title: 'SWYFT Thunder',          icon: Zap,         color: 'text-sky-400'    },
  { id: 'devsensor',   title: 'SWYFT DEV Sensor',       icon: Activity,    color: 'text-purple-400' },
  { id: 'encoders',    title: 'Encoders',               icon: Gauge,       color: 'text-indigo-400' },
  { id: 'imu',         title: 'IMU & Gyroscope',        icon: TrendingUp,  color: 'text-emerald-400'},
  { id: 'firmware',    title: 'Firmware Updates',       icon: Cpu,         color: 'text-amber-400'  },
  { id: 'commands',    title: 'Serial Commands',        icon: Terminal,    color: 'text-teal-400'   },
  { id: 'troubleshoot',title: 'Troubleshooting',        icon: AlertCircle, color: 'text-red-400'    },
]

/* ─── Shared components ──────────────────────────────────────────────────── */
function SectionHeading({ icon: Icon, color, children }: { icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-800">
      <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/80 border border-slate-700')}>
        <Icon className={clsx('w-5 h-5', color)} />
      </div>
      <h2 className="text-xl font-bold text-white">{children}</h2>
    </div>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-slate-200 mt-7 mb-3">{children}</h3>
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-400 text-sm leading-relaxed mb-3">{children}</p>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0a0f1a] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed mb-4 overflow-x-auto">
      {children}
    </div>
  )
}

function Callout({ type = 'info', children }: { type?: 'info' | 'warn' | 'tip' | 'danger'; children: React.ReactNode }) {
  const styles = {
    info:   { bg: 'bg-sky-500/10',    border: 'border-sky-500/25',   text: 'text-sky-300',    icon: Info,         label: 'Note' },
    warn:   { bg: 'bg-amber-500/10',  border: 'border-amber-500/25', text: 'text-amber-300',  icon: AlertCircle,  label: 'Warning' },
    tip:    { bg: 'bg-emerald-500/10',border: 'border-emerald-500/25',text: 'text-emerald-300',icon: CheckCircle, label: 'Tip' },
    danger: { bg: 'bg-red-500/10',    border: 'border-red-500/25',   text: 'text-red-300',    icon: AlertCircle,  label: 'Danger' },
  }
  const s = styles[type]
  const Icon = s.icon
  return (
    <div className={clsx('flex gap-3 p-4 rounded-xl border mb-4 text-sm', s.bg, s.border)}>
      <Icon className={clsx('w-4 h-4 flex-shrink-0 mt-0.5', s.text)} />
      <div className={clsx('leading-relaxed', s.text)}>
        <strong>{s.label}: </strong>{children}
      </div>
    </div>
  )
}

function Badge({ children, color = 'sky' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    sky:    'bg-sky-500/15 text-sky-400 border-sky-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    amber:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
    green:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    red:    'bg-red-500/15 text-red-400 border-red-500/30',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium', colors[color] ?? colors.sky)}>
      {children}
    </span>
  )
}

function TableRow({ cells }: { cells: React.ReactNode[] }) {
  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
      {cells.map((c, i) => (
        <td key={i} className="px-3 py-2.5 text-xs text-slate-300 font-mono first:text-sky-300">{c}</td>
      ))}
    </tr>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            {headers.map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => <TableRow key={i} cells={r} />)}
        </tbody>
      </table>
    </div>
  )
}

function StepList({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <ol className="space-y-3 mb-4">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200">{s.title}</div>
            <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ─── Section content ────────────────────────────────────────────────────── */
function QuickStartSection() {
  return (
    <div>
      <SectionHeading icon={Zap} color="text-sky-400">Quick Start</SectionHeading>
      <Para>
        SWYFT Link is a browser-based device interface for SWYFT Robotics hardware. It communicates directly over USB
        using the WebSerial API — no drivers, no installation, no app store required.
      </Para>
      <Callout type="info">
        SWYFT Link works in <strong>Chrome 89+</strong> and <strong>Edge 89+</strong> only. Firefox and Safari do not support WebSerial.
        You can install it as a desktop app (PWA) from the browser menu for offline use.
      </Callout>

      <SubHeading>Connect your device</SubHeading>
      <StepList steps={[
        { title: 'Plug in via USB-C', desc: 'Connect your SWYFT device to your computer. Windows users may see a COM port appear in Device Manager.' },
        { title: 'Click "Connect"', desc: 'Click the Connect button in the top-right corner. A port picker dialog will appear — select the SWYFT device (usually "STM32 Virtual COM Port").' },
        { title: 'Device is auto-detected', desc: 'SWYFT Link reads the firmware handshake and automatically identifies whether you have a Thunder or DEV Sensor board.' },
        { title: 'Start working', desc: 'The sidebar populates with the right tools for your device. Previously connected devices reconnect automatically next time you plug them in.' },
      ]} />

      <SubHeading>Supported devices</SubHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-white text-sm">SWYFT Thunder</span>
            <Badge color="sky">Motor Controller</Badge>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Brushless FOC motor controller for FRC robotics. Features real-time motor control, PID tuning, CAN bus integration, and encoder feedback.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-white text-sm">SWYFT DEV Sensor</span>
            <Badge color="purple">Sensor Board</Badge>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-sensor development board with dual magnetic encoders (MT6701 + AS5600), 6-axis IMU (LSM6DSO), temperature sensor, and ADC inputs.
          </p>
        </div>
      </div>

      <SubHeading>Browser requirements</SubHeading>
      <Table
        headers={['Browser', 'Version', 'WebSerial', 'WebUSB (DFU)']}
        rows={[
          ['Chrome',  '89+', <Badge color="green">✓ Supported</Badge>, <Badge color="green">✓ Supported</Badge>],
          ['Edge',    '89+', <Badge color="green">✓ Supported</Badge>, <Badge color="green">✓ Supported</Badge>],
          ['Opera',   '75+', <Badge color="green">✓ Supported</Badge>, <Badge color="green">✓ Supported</Badge>],
          ['Firefox', 'Any', <Badge color="red">✗ Not supported</Badge>, <Badge color="red">✗ Not supported</Badge>],
          ['Safari',  'Any', <Badge color="red">✗ Not supported</Badge>, <Badge color="red">✗ Not supported</Badge>],
        ]}
      />
    </div>
  )
}

function ThunderSection() {
  return (
    <div>
      <SectionHeading icon={Zap} color="text-sky-400">SWYFT Thunder Motor Controller</SectionHeading>
      <Para>
        The SWYFT Thunder is a high-performance brushless FOC (Field-Oriented Control) motor controller designed for FRC robotics.
        It communicates over USB-C for configuration and direct control, and supports CAN bus for robot integration.
      </Para>

      <SubHeading>Control Tab</SubHeading>
      <Para>
        Send real-time motor commands. Use duty cycle mode for open-loop testing, or velocity/position PID modes for precise control.
        Always ensure the motor is safe to move before sending commands — the controller will stop automatically if USB is disconnected.
      </Para>
      <Callout type="warn">
        The Thunder requires ≥7V on the power input to drive motors. Running on USB power alone (5V) is safe for configuration
        but will not spin motors. Connect a 12–24V battery or power supply.
      </Callout>

      <SubHeading>Config Tab — PID Tuning</SubHeading>
      <Para>
        Configure PID gains for velocity and position loops, current limits, ramp rates, and encoder settings.
        All values are stored to flash and persist across power cycles.
      </Para>
      <Callout type="danger">
        Flashing new firmware erases all saved configuration (PID gains, settings). Note down your values before updating firmware.
      </Callout>

      <SubHeading>CAN Bus</SubHeading>
      <Para>
        Thunder supports SWYFT's CAN protocol for multi-device robot integration. When configured as CAN master,
        USB motor control is disabled — the device is controlled entirely by the CAN network. Power cycle to re-enable USB control.
      </Para>
      <Table
        headers={['CAN Mode', 'Description']}
        rows={[
          ['Slave',  'Receives commands from CAN master (typical FRC integration)'],
          ['Master', 'Acts as network coordinator; USB control disabled'],
          ['Off',    'CAN disabled; USB control active (default)'],
        ]}
      />

      <SubHeading>Input Tab</SubHeading>
      <Para>
        Assign analog and digital inputs (limit switches, position sensors) to motor control functions.
        Useful for setting software travel limits or enabling/disabling motor motion based on sensor state.
      </Para>
    </div>
  )
}

function DevSensorSection() {
  return (
    <div>
      <SectionHeading icon={Activity} color="text-purple-400">SWYFT DEV Sensor Board</SectionHeading>
      <Para>
        The SWYFT DEV Sensor board is a compact multi-sensor module designed for robotics R&D. It packs
        two magnetic encoders, a 6-axis IMU, a TCS color/magnet sensor, NTC thermistor, and a supply voltage
        monitor onto a small PCB connected via USB-C.
      </Para>

      <SubHeading>Sensor inventory</SubHeading>
      <Table
        headers={['Component', 'Type', 'Interface', 'Resolution / Range']}
        rows={[
          ['MT6701 (U1)', 'Magnetic encoder', 'ABZ / SSI', '14-bit abs (16384 cpr), up to 1024 lines ABZ'],
          ['AS5600 (U6)', 'Magnetic encoder', 'I²C', '12-bit abs (4096 cpr), 0.088°/step'],
          ['LSM6DSO',     '6-axis IMU',       'SPI/I²C', '±16g accel, ±2000 dps gyro'],
          ['TCS',         'Color/magnet',     'I²C', 'RGB + proximity + magnet detect'],
          ['NTC',         'Temperature',      'ADC', '−40 to +125 °C'],
          ['VSEN',        'Supply voltage',   'ADC', '0–3.3V (with voltage divider)'],
        ]}
      />

      <SubHeading>Dashboard Tab</SubHeading>
      <Para>
        The Dashboard shows a real-time overview of all sensors at a glance — voltage, temperature,
        encoder positions, IMU readings, and magnet detection status. This is your starting point for
        verifying that all sensors are alive and reading correctly.
      </Para>

      <SubHeading>Sensors Tab</SubHeading>
      <Para>
        Deep-dive into individual sensor readings. Shows absolute encoder angles (0–360°),
        multi-turn relative position (accumulated turns and total degree count), and IMU acceleration / gyroscope data.
      </Para>

      <SubHeading>Graphs Tab</SubHeading>
      <Para>
        Time-series charts for all sensor channels. Useful for analyzing motion profiles, checking
        encoder linearity, monitoring temperature drift, and debugging vibration issues. Data is buffered
        in-browser — no data is sent to the cloud.
      </Para>

      <SubHeading>LED indicator (U8)</SubHeading>
      <Para>
        The green indicator LED flashes a 1 Hz heartbeat when all sensors are operating normally
        (100 ms ON, 900 ms OFF). If any sensor reports an error, it switches to a rapid 200 ms blink.
      </Para>
    </div>
  )
}

function EncoderSection() {
  return (
    <div>
      <SectionHeading icon={Gauge} color="text-indigo-400">Encoders</SectionHeading>

      <SubHeading>MT6701 — High-Resolution Magnetic Encoder</SubHeading>
      <Para>
        The MT6701 is a 14-bit absolute magnetic encoder that provides both SSI (absolute) and ABZ (incremental)
        interfaces. It detects rotation from a diametrically magnetized magnet mounted on the shaft.
      </Para>

      <div className="bg-slate-900 border border-indigo-500/20 rounded-xl p-4 mb-4">
        <div className="text-xs font-semibold text-indigo-300 mb-3 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" /> MODE Pin — Critical for resolution
        </div>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex gap-3">
            <span className="font-mono text-red-400 flex-shrink-0 w-24">GND (LOW)</span>
            <span>ABZ quadrature mode. Factory default: 1 line/rev (4 counts). EEPROM can be programmed up to 1024 lines/rev (4096 counts).</span>
          </div>
          <div className="flex gap-3">
            <span className="font-mono text-emerald-400 flex-shrink-0 w-24">3.3V (HIGH)</span>
            <span>SSI serial mode. Outputs full 14-bit absolute position (16384 counts/rev). Required for max resolution.</span>
          </div>
        </div>
      </div>

      <Callout type="info">
        Current hardware (v1) has MODE tied to GND, giving ABZ mode with software interpolation for display smoothing.
        The "encoder change" hardware revision pulls MODE to 3.3V via 10kΩ (R13) for full SSI resolution — firmware
        will be updated to use SSI when the new boards are fabricated.
      </Callout>

      <SubHeading>MT6701 ABZ mode — resolution table</SubHeading>
      <Table
        headers={['ABZ Lines/Rev', 'Counts/Rev (×4)', 'Step Size', 'How to achieve']}
        rows={[
          ['1 (factory default)', '4', '90.0°', 'Default EEPROM (no changes needed)'],
          ['16', '64', '5.625°', 'Program ABZ_RES via I²C (MODE must be HIGH during programming)'],
          ['256', '1024', '0.352°', 'Program ABZ_RES via I²C'],
          ['1024 (max ABZ)', '4096', '0.088°', 'Program ABZ_RES via I²C — maximum ABZ resolution'],
          ['N/A (SSI mode)', '16384', '0.022°', 'Pull MODE pin HIGH — reads full 14-bit absolute value'],
        ]}
      />

      <SubHeading>Reprogramming MT6701 EEPROM (ABZ resolution)</SubHeading>
      <Callout type="warn">
        To program the EEPROM, the MODE pin must be HIGH (3.3V) or floating — not tied to GND. This is a one-time
        hardware change or requires a temporary modification. Power-cycle after programming to apply the new resolution.
      </Callout>
      <StepList steps={[
        { title: 'Temporarily pull MODE to 3.3V', desc: 'If MODE is normally grounded, temporarily lift the pin or use a patch wire to 3.3V.' },
        { title: 'Send I²C programming command', desc: 'Use SWYFT Link firmware\'s ABZPROG command (when implemented) or MagAlpha Studio to write ABZ_RES = 1024 to EEPROM.' },
        { title: 'Power-cycle the board', desc: 'After programming completes, cycle power with MODE still in its final configuration (GND for ABZ, 3.3V for SSI).' },
        { title: 'Update firmware define', desc: 'Change MT6701_ABZ_COUNTS_PER_REV to 4096 in ds_sensors.h and rebuild/reflash firmware.' },
      ]} />

      <SubHeading>AS5600 — 12-bit Magnetic Encoder</SubHeading>
      <Para>
        The AS5600 is a 12-bit absolute magnetic encoder using I²C. It reads 0–4095 counts per revolution,
        corresponding to 0–360° with 0.088° resolution per step. No configuration required — it reads
        absolute position immediately on power-up.
      </Para>
      <Table
        headers={['Parameter', 'Value']}
        rows={[
          ['Resolution', '12-bit (4096 counts/rev)'],
          ['Angular step', '0.088°'],
          ['Interface', 'I²C (address 0x36)'],
          ['Supply', '3.3V or 5V'],
          ['Output', 'Absolute 0–360° (no index)'],
        ]}
      />
      <Callout type="tip">
        The AS5600 reports absolute position within a single revolution only. For multi-turn tracking,
        use the MT6701 with its accumulated count display in SWYFT Link.
      </Callout>

      <SubHeading>Encoder display — relative vs. absolute</SubHeading>
      <Para>
        SWYFT Link shows both representations simultaneously for the MT6701:
      </Para>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-indigo-300 mb-2">Absolute (0–360°)</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Position within the current revolution. Wraps back to 0° every full rotation.
            Useful for measuring angular position of a joint or wheel sector.
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-purple-300 mb-2">Relative (multi-turn)</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Accumulated rotation since power-on. Shows total turns, angle within the current turn,
            raw count, and direction. Useful for measuring total travel distance.
          </div>
        </div>
      </div>
    </div>
  )
}

function ImuSection() {
  return (
    <div>
      <SectionHeading icon={TrendingUp} color="text-emerald-400">IMU & Gyroscope — LSM6DSO</SectionHeading>
      <Para>
        The LSM6DSO is a 6-axis inertial measurement unit (IMU) by STMicroelectronics, combining a
        3-axis accelerometer and a 3-axis gyroscope in a single package. It communicates over I²C/SPI
        and is used for measuring orientation, angular velocity, and linear acceleration.
      </Para>

      <SubHeading>Measurement ranges</SubHeading>
      <Table
        headers={['Axis', 'Sensor', 'Unit', 'Default Range']}
        rows={[
          ['X, Y, Z', 'Accelerometer', 'mg (milli-g)', '±16,000 mg (±16g)'],
          ['X, Y, Z', 'Gyroscope',     'mdps (milli-°/s)', '±2,000,000 mdps (±2000 dps)'],
          ['—',       'Temperature',   '°C', '−40 to +85 °C'],
        ]}
      />

      <SubHeading>Displayed values in SWYFT Link</SubHeading>
      <Para>
        The Sensors tab shows raw accelerometer values in mg and raw gyroscope values in dps (degrees per second).
        The Graphs tab charts all 6 channels over time, which is useful for detecting vibration,
        validating IMU mounting orientation, or recording motion profiles.
      </Para>
      <Callout type="tip">
        At rest on a flat surface you should see ~0 mg on X and Y axes, and ~+1000 mg (+1g) on Z.
        If you see unexpected values, check that the board is securely mounted without mechanical stress on the PCB.
      </Callout>

      <SubHeading>LSM6DSO error flags</SubHeading>
      <Para>
        If the IMU fails to initialize or loses communication, bit 2 of the error flags register (0x04) will be set.
        The LED will switch to rapid blink mode. Check the Console tab for error messages with the STATUS command.
      </Para>
    </div>
  )
}

function FirmwareSection() {
  return (
    <div>
      <SectionHeading icon={Cpu} color="text-amber-400">Firmware Updates</SectionHeading>
      <Para>
        SWYFT Link includes a built-in firmware flasher using WebUSB and the STM32 DFU bootloader.
        No external tools or drivers are required — flashing is done entirely in the browser.
      </Para>

      <SubHeading>Method 1: Flash from connected device (recommended)</SubHeading>
      <StepList steps={[
        { title: 'Go to Firmware tab', desc: 'While connected to your device, navigate to the Firmware tab in the sidebar.' },
        { title: 'Select firmware', desc: 'Click "Select" next to the bundled firmware version, or upload a custom .bin file.' },
        { title: 'Click "Flash Firmware"', desc: 'SWYFT Link sends a DFU command over serial, waits for the device to reboot into bootloader mode, then flashes via WebUSB.' },
        { title: 'Wait for completion', desc: 'A progress bar shows erase → write → verify phases. Takes ~15–30 seconds.' },
        { title: 'Reconnect', desc: 'After flashing completes, click "Reconnect Device". The device boots from new firmware.' },
      ]} />

      <SubHeading>Method 2: Manual DFU (device bricked / unresponsive)</SubHeading>
      <Callout type="warn">
        Use this method only if your device is unresponsive and cannot be put into DFU mode automatically via serial command.
      </Callout>
      <StepList steps={[
        { title: 'Unplug from USB and power', desc: 'Completely disconnect the device.' },
        { title: 'Hold the DFU button', desc: 'Locate the small DFU button on the back of the board and hold it down.' },
        { title: 'Plug in USB-C', desc: 'While holding the button, plug in USB-C to your computer.' },
        { title: 'Release after 2 seconds', desc: 'The device will enumerate as "STM32 BOOTLOADER" in Windows Device Manager.' },
        { title: 'Flash via Recover section', desc: 'On the SWYFT Link connect screen, expand "Recover / Flash Firmware", select your firmware, and click Flash.' },
      ]} />

      <SubHeading>Firmware files</SubHeading>
      <Table
        headers={['File', 'Device', 'Notes']}
        rows={[
          ['SWYFT_THUNDER_*.bin',    'Thunder Motor Controller', 'Generated from devsensor_fw project, STM32 format'],
          ['SWYFT_DEVSENSOR_*.bin',  'DEV Sensor Board',         'Generated from devsensor_fw project, STM32 format'],
        ]}
      />
      <Callout type="danger">
        Always use the raw <strong>.bin</strong> file for flashing — not .hex or .elf. The DFU flasher expects a binary image
        at the correct memory offset (0x08000000).
      </Callout>
      <Callout type="tip">
        Flashing erases all saved configuration. Note down your PID gains and settings on the Config tab before updating.
      </Callout>
    </div>
  )
}

function CommandsSection() {
  return (
    <div>
      <SectionHeading icon={Terminal} color="text-teal-400">Serial Commands</SectionHeading>
      <Para>
        SWYFT devices accept plain-text commands over the USB serial connection. Commands are
        newline-terminated. Responses start with <code className="text-teal-300 bg-slate-800 px-1 rounded">{"<"} </code>
        for device→host and <code className="text-teal-300 bg-slate-800 px-1 rounded">{">"} </code> for host→device.
        Use the Console tab to send commands manually.
      </Para>

      <SubHeading>Common commands (both devices)</SubHeading>
      <Table
        headers={['Command', 'Response', 'Description']}
        rows={[
          ['VERSION', 'VERSION:fw=<ver>,build=<date>', 'Query firmware version and build timestamp'],
          ['HELP',    'HELP:cmd1,cmd2,...',             'List available commands'],
          ['DEBUG',   'various',                         'Dump internal debug state to console'],
        ]}
      />

      <SubHeading>DEV Sensor commands</SubHeading>
      <Table
        headers={['Command', 'Response', 'Description']}
        rows={[
          ['STATUS', '#S:vsen=X,ntc=X,as5600=X,mt6701=X,cnt=X,turn=X,ax=X,...', 'One-shot status packet (same format as streaming)'],
          ['ABZDBG', 'ABZDBG:count=X,cpr=X,angle=X', 'Dump MT6701 ABZ decoder state'],
        ]}
      />

      <SubHeading>Thunder commands</SubHeading>
      <Table
        headers={['Command', 'Response', 'Description']}
        rows={[
          ['STOP',     'STOP:ok',               'Immediately stop motor (disable output)'],
          ['ENCODER',  'ENCODER:pos=X,vel=X',   'Read current encoder position and velocity'],
          ['CANDEN',   'CAN:en=1/0',             'Enable or disable CAN bus'],
          ['CANSTATUS','CANSTATUS:...',           'Dump CAN bus state and error counters'],
          ['IWDG',     'IWDG:...',               'Query watchdog timer state'],
          ['DFUCHECK', 'DFU:...',                'Verify DFU bootloader is present and accessible'],
        ]}
      />

      <SubHeading>Status packet format (DEV Sensor)</SubHeading>
      <Para>
        The DEV Sensor streams a status packet at ~100 Hz. The packet format is:
      </Para>
      <Code>
        <div className="text-slate-500"># Streaming packet format</div>
        <div className="text-emerald-300 mt-1">#S:vsen=3.30,ntc=24.5,as5600=2048,mt6701=8192,cnt=4096,turn=1,</div>
        <div className="text-emerald-300">{'    '}ax=12,ay=-8,az=1003,gx=50,gy=-20,gz=5,imu_t=25.3,magnet=0,err=0x00</div>
        <div className="text-slate-500 mt-2"># Key fields:</div>
        <div className="text-sky-300">{'  '}vsen    — supply voltage (V)</div>
        <div className="text-sky-300">{'  '}ntc     — board temperature (°C)</div>
        <div className="text-sky-300">{'  '}as5600  — AS5600 raw count (0–4095)</div>
        <div className="text-sky-300">{'  '}mt6701  — MT6701 absolute raw count (0–16383)</div>
        <div className="text-sky-300">{'  '}cnt     — MT6701 unbounded ABZ count since power-on (signed)</div>
        <div className="text-sky-300">{'  '}turn    — MT6701 complete revolutions (signed)</div>
        <div className="text-sky-300">{'  '}ax/ay/az — accelerometer (mg)</div>
        <div className="text-sky-300">{'  '}gx/gy/gz — gyroscope (mdps)</div>
        <div className="text-sky-300">{'  '}magnet  — TCS magnet detection (0/1)</div>
        <div className="text-sky-300">{'  '}err     — error flags bitmask (0x00 = all ok)</div>
      </Code>

      <SubHeading>Error flags bitmask</SubHeading>
      <Table
        headers={['Bit', 'Mask', 'Meaning']}
        rows={[
          ['0', '0x01', 'AS5600 communication error'],
          ['1', '0x02', 'MT6701 communication error'],
          ['2', '0x04', 'IMU (LSM6DSO) communication error'],
          ['3–7', '0xF8', 'Reserved'],
        ]}
      />
    </div>
  )
}

function TroubleshootSection() {
  return (
    <div>
      <SectionHeading icon={AlertCircle} color="text-red-400">Troubleshooting</SectionHeading>

      <SubHeading>Device not found / no port in picker</SubHeading>
      <Para>Check the following:</Para>
      <div className="space-y-2 mb-4">
        {[
          'Use Chrome or Edge — WebSerial is not supported in Firefox or Safari.',
          'Try a different USB-C cable (data-capable, not charge-only).',
          'Check Device Manager — the device should appear as "STM32 Virtual COM Port" or "STMicroelectronics Virtual COM Port".',
          'If no COM port appears at all, try flashing firmware via the DFU Recover procedure — the board may have corrupt firmware.',
          'Try a different USB port (use a USB-A to USB-C adapter to try a different physical port if needed).',
          'On some Windows systems, the STM32 VCP driver must be installed manually from STMicroelectronics.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-slate-400">
            <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <SubHeading>Encoder reading 90° steps (not smooth)</SubHeading>
      <Para>
        The MT6701 in ABZ mode with factory EEPROM defaults outputs only 1 line/rev (4 counts/revolution = 90° steps).
        SWYFT Link applies software interpolation to smooth the display, but the underlying hardware resolution
        is still 90°.
      </Para>
      <Para>
        To get true high resolution:
      </Para>
      <div className="space-y-2 mb-4">
        {[
          'Option A (ABZ max): Reprogram the MT6701 EEPROM to 1024 lines/rev. Requires MODE pin temporarily HIGH during programming. See the Encoders section.',
          'Option B (SSI mode): Pull the MT6701 MODE pin to 3.3V permanently. This gives full 14-bit (16384 cpr) absolute output. Hardware change required — see the "encoder change" schematic revision.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-slate-400">
            <ChevronRight className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <SubHeading>LED not flashing on DEV Sensor</SubHeading>
      <Para>
        The indicator LED (U8) on early boards was installed with reversed polarity. If your LED does not flash:
      </Para>
      <div className="space-y-2 mb-4">
        {[
          'Check that the board is receiving power (VSEN should read ~3.3V in SWYFT Link).',
          'If VSEN is OK but LED is dark, the LED may be installed backwards — check anode (+) / cathode (−) orientation.',
          'The "encoder change" hardware revision corrects the LED polarity and replaces R10 (2.1kΩ) with R26 (470Ω) for increased brightness.',
          'Verify no error flags are set — if err ≠ 0x00, the LED blinks rapidly; if sensors are failing, the blink may be too fast to see clearly.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-slate-400">
            <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <SubHeading>Firmware flash fails</SubHeading>
      <div className="space-y-2 mb-4">
        {[
          'Only Chrome and Edge support WebUSB for DFU. Use one of these browsers.',
          'Make sure you\'re using the raw .bin file — not .hex or .elf.',
          'If the device doesn\'t enter DFU automatically, use Manual DFU mode (hold DFU button on plug-in).',
          'On Windows, DFU mode may require installing the "WinUSB" or "libusbK" driver for the STM32 BOOTLOADER device using Zadig.',
          'After a failed flash, the device may be in an unknown state. Try Manual DFU recovery.',
        ].map((s, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-slate-400">
            <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <SubHeading>AS5600 reading erratic values</SubHeading>
      <Callout type="warn">
        In the original hardware revision, the AS5600 (U6) had floating VDD (pin 1) and GND (pin 3) pins.
        This is fixed in the "encoder change" schematic revision — U6-1 is tied to 3.3V and U6-3 to GND.
        If you see erratic AS5600 readings on an older board, this may be the cause.
      </Callout>

      <SubHeading>Still stuck?</SubHeading>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <ExternalLink className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-400">
          Visit <a href="https://swyftrobotics.com" target="_blank" rel="noopener" className="text-sky-400 hover:text-sky-300 underline">swyftrobotics.com</a> or
          check the GitHub repository for issues and discussions. Include your firmware version
          (see Firmware tab), the error flags value, and the Console log output when reporting issues.
        </div>
      </div>
    </div>
  )
}

/* ─── Main DocsTab ───────────────────────────────────────────────────────── */
export function DocsTab() {
  const [activeSection, setActiveSection] = useState('quickstart')

  const contentMap: Record<string, React.ReactNode> = {
    quickstart:   <QuickStartSection />,
    thunder:      <ThunderSection />,
    devsensor:    <DevSensorSection />,
    encoders:     <EncoderSection />,
    imu:          <ImuSection />,
    firmware:     <FirmwareSection />,
    commands:     <CommandsSection />,
    troubleshoot: <TroubleshootSection />,
  }

  return (
    <div className="flex gap-6 min-h-full">
      {/* Table of contents */}
      <aside className="w-52 flex-shrink-0 hidden lg:block">
        <div className="sticky top-0 pt-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-2 px-2">Contents</div>
          <nav className="space-y-0.5">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left',
                  activeSection === s.id
                    ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                )}
              >
                <s.icon className={clsx('w-3.5 h-3.5 flex-shrink-0', activeSection === s.id ? s.color : 'text-slate-600')} />
                {s.title}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile section picker */}
      <div className="lg:hidden mb-4 w-full">
        <select
          value={activeSection}
          onChange={e => setActiveSection(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
        >
          {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-3xl">
        {/* SWYFT header banner */}
        <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border border-sky-500/15 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <img src="./swyft-logo.png" alt="SWYFT" className="w-10 h-10 flex-shrink-0" />
          <div>
            <div className="text-lg font-bold text-white tracking-tight">SWYFT Link Documentation</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Complete reference for SWYFT Robotics hardware and software
            </div>
          </div>
          <a
            href="https://swyftrobotics.com"
            target="_blank"
            rel="noopener"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors flex-shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            swyftrobotics.com
          </a>
        </div>

        {contentMap[activeSection]}
      </div>
    </div>
  )
}
