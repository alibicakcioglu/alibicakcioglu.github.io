# Cyber Flora — Hardware Edition

An interactive neon motherboard exploring attention, overload, and loss of control. Move your cursor between unlabeled hardware modules.

## Modes

- **Infinite Capacity:** modules glow while receiving attention and never trap the cursor.
- **Overload Trap:** Load rises from 0% to 100% over 3 seconds of attention. Returning to a module resumes its remaining load rather than starting again. While disconnected, load falls by one-sixth of full capacity per second. At 100%, the cursor locks for 4 seconds, then load resets to zero and the module turns gray.

## Controls

- **Pointer:** hover over a module to supply power; disconnect before 100% to let it cool.
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
