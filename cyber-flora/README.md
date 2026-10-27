# Cyber Flora — Hardware Edition

An interactive neon motherboard exploring attention, overload, and loss of control. Move your cursor between CPU, GPU, RAM, BIOS, power, and I/O modules.

## Modes

- **Infinite Capacity:** modules glow while receiving attention and never trap the cursor.
- **Overload Trap:** 3 continuous seconds of attention overload a module and lock the custom cursor for 4 seconds. It then cools to gray and releases control.

## Controls

- **Pointer:** hover over a module to supply power; leave before the threshold.
- **Keyboard:** use Tab or Shift+Tab to explore modules. Focus supplies power; overloaded modules temporarily retain focus.
- **Escape:** release an active lock early.
- **Touch:** press and hold a module.
- **Reset system:** clear module state and session counters.

Switching modes resets the board and its counters. There is no sound.

## Run locally

Serve this folder with any static web server, for example:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The source uses native JavaScript modules, so serve it over HTTP rather than opening index.html directly from disk. No build step or package installation is needed.

## Files

- `index.html` — interface and instructions
- `style.css` — responsive PCB layout, components, and neon effects
- `app.mjs` — input handling and rendering
- `engine.mjs` — timestamp-based interaction state machine

Google Fonts are optional; system fonts are used when unavailable.
