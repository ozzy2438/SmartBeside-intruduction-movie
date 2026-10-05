#!/usr/bin/env python3
"""Restrained sound for the Kinbuild film. No score. Stone, pulse, one impact."""

import array
import json
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CUES = json.loads((ROOT / "cues.json").read_text())
SR = int(CUES.get("sampleRate", 48000))
DURATION = float(CUES["duration"])
N = int(DURATION * SR)
LEFT = array.array("f", [0.0]) * N
RIGHT = array.array("f", [0.0]) * N
RNG = random.Random(7)


def clamp_sample(value):
    return max(-1.0, min(1.0, value))


def write(index, left, right):
    if 0 <= index < N:
        LEFT[index] += left
        RIGHT[index] += right


def pan_gains(pan):
    angle = (pan + 1) * 0.25 * math.pi
    return math.cos(angle), math.sin(angle)


class OnePole:
    def __init__(self):
        self.z = 0.0

    def low(self, sample, coeff):
        self.z += coeff * (sample - self.z)
        return self.z


def add_noise_burst(start, seconds, gain, pan, hp=0.2, lp=0.35, color=1.0):
    count = int(seconds * SR)
    i0 = int(start * SR)
    left_gain, right_gain = pan_gains(pan)
    low_l = OnePole()
    low_r = OnePole()
    hp_l = OnePole()
    hp_r = OnePole()
    for n in range(count):
        env = math.sin(math.pi * n / max(1, count - 1)) ** 1.4
        attack = min(1.0, n / max(1, 0.012 * SR))
        white_l = RNG.uniform(-1, 1)
        white_r = RNG.uniform(-1, 1)
        body_l = low_l.low(white_l, lp)
        body_r = low_r.low(white_r, lp)
        grit_l = white_l - hp_l.low(white_l, hp)
        grit_r = white_r - hp_r.low(white_r, hp)
        sample_l = (body_l * 0.75 + grit_l * color) * env * attack * gain
        sample_r = (body_r * 0.75 + grit_r * color) * env * attack * gain
        write(i0 + n, sample_l * left_gain, sample_r * right_gain)


def add_tone(start, seconds, freq, gain, pan, decay, freq_end=None, attack=0.01, target=None):
    count = int(seconds * SR)
    i0 = int(start * SR)
    left_gain, right_gain = pan_gains(pan)
    phase = 0.0
    sink = target if target is not None else (LEFT, RIGHT)
    for n in range(count):
        u = n / max(1, count - 1)
        f = freq if freq_end is None else freq + (freq_end - freq) * u
        phase += 2 * math.pi * f / SR
        rise = min(1.0, n / max(1, attack * SR))
        env = rise * math.exp(-n / max(1.0, decay * SR))
        sample = math.sin(phase) * env * gain
        index = i0 + n
        if 0 <= index < N:
            sink[0][index] += sample * left_gain
            sink[1][index] += sample * right_gain * 0.96


def add_scrape(t, gain, pan):
    add_noise_burst(t, 0.22, gain * 0.55, pan, hp=0.18, lp=0.22, color=0.85)
    add_tone(t, 0.16, 96, gain * 0.22, pan, 0.05)


def add_tick(t, gain, pan):
    add_noise_burst(t, 0.035, gain * 0.45, pan, hp=0.4, lp=0.55, color=1.0)
    add_tone(t, 0.18, 168, gain * 0.35, pan, 0.045, freq_end=120)


def add_pulse(t, gain, pan):
    add_tone(t, 0.42, 58, gain * 0.55, pan, 0.11)
    add_tone(t, 0.3, 116, gain * 0.12, pan, 0.07)
    add_noise_burst(t, 0.05, gain * 0.08, pan, hp=0.08, lp=0.12, color=0.3)


def add_air(t, gain, pan):
    add_noise_burst(t, 2.8, gain * 0.35, pan, hp=0.04, lp=0.08, color=0.25)


def add_fall(t, gain, pan):
    add_tone(t, 0.42, 210, gain * 0.28, pan, 0.09, freq_end=62)
    add_noise_burst(t, 0.28, gain * 0.4, pan, hp=0.15, lp=0.28, color=0.9)
    add_tick(t + 0.46, gain * 0.55, pan)


def add_impact(t, gain, pan):
    add_tone(t, 2.4, 46, gain * 0.7, pan, 0.55)
    add_tone(t, 1.6, 92, gain * 0.16, pan, 0.28)
    add_noise_burst(t, 0.08, gain * 0.22, pan, hp=0.05, lp=0.1, color=0.4)


def add_room():
    low_l = OnePole()
    low_r = OnePole()
    for n in range(N):
        fade_in = min(1.0, n / (0.8 * SR))
        fade_out = min(1.0, (N - n) / (1.1 * SR))
        # Quieter under the final card.
        tail = 1.0
        time = n / SR
        if time > 27.5:
            tail = 0.45 + 0.55 * (1 - min(1.0, (time - 27.5) / 4.0))
        white_l = RNG.uniform(-1, 1)
        white_r = RNG.uniform(-1, 1)
        sample_l = low_l.low(white_l, 0.02)
        sample_r = low_r.low(white_r, 0.018)
        amp = 0.018 * fade_in * fade_out * tail
        LEFT[n] += sample_l * amp
        RIGHT[n] += sample_r * amp


def midi_freq(note):
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def add_piano(start, note, seconds, gain, pan=0.0):
    fundamental = midi_freq(note)
    partials = ((1.0, 1.0, 0.55), (2.0, 0.28, 0.28), (3.0, 0.09, 0.16), (4.0, 0.04, 0.1))
    for ratio, level, decay in partials:
        add_tone(start, seconds, fundamental * ratio, gain * level, pan, decay, attack=0.012, target=MUSIC)


def add_pad(start, note, seconds, gain, pan=0.0):
    fundamental = midi_freq(note)
    add_tone(start, seconds + 0.8, fundamental, gain, pan, seconds * 0.9, attack=0.55, target=MUSIC)
    add_tone(start, seconds + 0.8, fundamental * 1.003, gain * 0.55, pan, seconds * 0.9, attack=0.7, target=MUSIC)


def add_score():
    # A small ensemble in D minor. It starts sparse and starts to move once they work.
    chords = (
        (0.6, (38, 50, 57), 7.6),
        (8.2, (41, 53, 58), 7.6),
        (15.8, (43, 50, 55), 7.8),
        (23.6, (38, 50, 57, 62), 8.2),
        (31.6, (38, 45, 50), 3.4),
    )
    for start, notes, length in chords:
        for index, note in enumerate(notes):
            add_pad(start, note, length, 0.055 if index == 0 else 0.03, pan=(-0.25 if index % 2 == 0 else 0.25))

    melody = (
        (1.3, 62, 1.5), (3.1, 65, 1.4), (5.0, 69, 1.6), (7.2, 67, 1.3),
        (9.0, 65, 1.4), (10.8, 64, 1.5), (12.8, 62, 1.4), (14.6, 69, 1.2),
        (16.2, 67, 1.1), (17.8, 65, 1.3), (19.6, 72, 1.5), (21.6, 69, 1.3),
        (23.4, 67, 1.4), (25.2, 65, 1.6), (27.4, 69, 1.5), (29.4, 65, 1.4),
        (31.2, 62, 2.0), (33.6, 62, 1.4),
    )
    for start, note, length in melody:
        add_piano(start, note, length, 0.11, pan=0.08)
        add_piano(start, note - 12, length * 0.8, 0.04, pan=-0.15)

    # The moving figure. Eighth notes, only after they start working together.
    step = 0.42
    figure = (0, 3, 7, 3, 8, 7, 3, 0)
    roots = ((11.6, 50, 4.2), (15.8, 53, 4.2), (20.0, 55, 3.6), (23.6, 50, 6.5))
    moment = 11.6
    end = 30.2
    index = 0
    while moment < end:
        root = 50
        for start, note, length in roots:
            if start <= moment < start + length:
                root = note
                break
        degree = figure[index % len(figure)]
        add_piano(moment, root + degree, step * 0.92, 0.045, pan=0.22 if index % 2 else -0.22)
        moment += step
        index += 1


def load_narration():
    manifest_path = ROOT / "vo" / "lines.json"
    if not manifest_path.exists():
        return []
    manifest = json.loads(manifest_path.read_text())
    clips = []
    for item in manifest:
        source = ROOT / "vo" / item["file"]
        wav_path = source.with_suffix(".wav")
        import subprocess
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(source), "-ar", str(SR), "-ac", "1", str(wav_path)],
            check=True,
        )
        with wave.open(str(wav_path), "r") as handle:
            frames = handle.readframes(handle.getnframes())
            samples = array.array("h")
            samples.frombytes(frames)
        clips.append((float(item["t"]), samples))
    return clips


def mix_narration(clips):
    duck = array.array("f", [0.0]) * N
    for start, samples in clips:
        begin = int(start * SR)
        for index, value in enumerate(samples):
            at = begin + index
            if 0 <= at < N:
                sample = (value / 32768.0) * 0.72
                LEFT[at] += sample
                RIGHT[at] += sample * 0.98
                duck[at] = 1.0
    # The bed steps aside for the voice, then returns.
    attack = 1.0 - math.exp(-1.0 / (0.04 * SR))
    release = 1.0 - math.exp(-1.0 / (0.35 * SR))
    state = 0.0
    for index in range(N):
        target = duck[index]
        state += (attack if target > state else release) * (target - state)
        bed = 1.0 - 0.62 * state
        MUSIC[0][index] *= bed
        MUSIC[1][index] *= bed


MUSIC = (array.array("f", [0.0]) * N, array.array("f", [0.0]) * N)


def main():
    add_room()
    add_score()
    mix_narration(load_narration())
    for index in range(N):
        LEFT[index] += MUSIC[0][index]
        RIGHT[index] += MUSIC[1][index]
    for event in CUES["events"]:
        kind = event["type"]
        t = float(event["t"])
        gain = float(event.get("gain", 0.2))
        pan = float(event.get("pan", 0))
        if kind == "scrape":
            add_scrape(t, gain, pan)
        elif kind == "tick":
            add_tick(t, gain, pan)
        elif kind == "pulse":
            add_pulse(t, gain, pan)
        elif kind == "air":
            add_air(t, gain, pan)
        elif kind == "fall":
            add_fall(t, gain, pan)
        elif kind == "impact":
            add_impact(t, gain, pan)
        else:
            raise SystemExit(f"Unknown cue {kind}")

    peak = 1e-6
    for n in range(N):
        peak = max(peak, abs(LEFT[n]), abs(RIGHT[n]))
    scale = 0.62 / peak if peak > 0.62 else 1.0
    out = array.array("h")
    for n in range(N):
        left = math.tanh(LEFT[n] * scale * 1.15)
        right = math.tanh(RIGHT[n] * scale * 1.15)
        out.append(int(clamp_sample(left) * 32767))
        out.append(int(clamp_sample(right) * 32767))

    path = ROOT / "kinbuild.wav"
    with wave.open(str(path), "w") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(out.tobytes())
    print(f"wrote {path} peak_in={peak:.3f} scale={scale:.3f} duration={DURATION:.2f}s")


if __name__ == "__main__":
    main()
