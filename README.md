# Nothing Ear(3) Spatial Hearing Lab (Prototype)

This repository contains a front-end prototype for a web app that visualizes where sound is coming from in a room, lets you amplify selected sources, and sketches how Michael Rubinstein’s micro-motion analysis could be integrated for precise localization.

## What’s included
- **Room sound map** with draggable sources that update their intensity in real time.
- **Source mixer** to toggle amplification and adjust gain per sound.
- **Web Bluetooth connection flow** to pair Nothing Ear(3) devices (browser support required).
- **Camera enablement** stub to represent Rubinstein-style micro-motion capture.
- **Live microphone capture** that routes the selected input device through a simulated Rubinstein gain stage and plays back to the default audio output.

## Run locally
```bash
python -m http.server 8080
```
Then open `http://localhost:8080` in a Chromium-based browser.

## Notes
- Web Bluetooth only works in secure contexts (https or localhost) and may require a Chromium-based browser.
- The micro-motion pipeline is represented as a UI stub; wiring in Eulerian video magnification would require a dedicated vision pipeline running in WebAssembly or a backend service.
- Output device selection is limited in the browser; playback routes to the system default (set your headphones as the OS output device).
