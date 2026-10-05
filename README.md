# Kinbuild

A 35-second cinematic brand film. Separate stones stand apart in a quiet hall. They turn toward each other, miss, test a fit, and work in a measured rhythm. Outside, the unfinished form meets pressure and lets one piece go. What remains assembles into an asymmetric gateway: different strengths, one direction.

The picture is a frame-locked Three.js scene. Under it is an original score, a calm English narration, and the sound of the stones. No stock music.

## Watch

`dist/kinbuild.mp4` is the film. To play the same scene in a browser, serve this repo and open `film/index.html`.

## Render again

```bash
npm install
npm run render
python3 audio/narrate.py
python3 audio/design.py
mkdir -p dist
ffmpeg -y -framerate 24 -i frames/frame_%04d.jpg -i audio/kinbuild.wav \
  -c:v libx264 -pix_fmt yuv420p -crf 17 -preset medium \
  -c:a aac -b:a 192k -movflags +faststart dist/kinbuild.mp4
```

`npm run render` writes a 1920×1080 JPEG sequence at 24 fps and refreshes `audio/cues.json`. `npm run stills` writes proof frames to `proof/`. The frame sequence and the WAV are local build products.
