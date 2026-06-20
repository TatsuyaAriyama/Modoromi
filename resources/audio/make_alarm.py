#!/usr/bin/env python3
"""Synthesise Madoromi's morning alarm tone as a WAV.

The tone mirrors the in-app "chime" (alarmSound.ts): a two-note motif
(880Hz -> 1320Hz) that loops on a 1.4s cycle and swells gently from quiet
to loud, so a light sleeper is coaxed awake rather than jolted. Run, then
convert to CAF for the iOS bundle:

    python3 make_alarm.py
    afconvert -f caff -d LEI16@44100 -c 1 madoromi_alarm.wav \
        ../../ios/App/App/madoromi_alarm.caf

iOS notification sounds must be <=30s and live in the app bundle. Keep this
at ~12s so it rings long enough to wake without overlapping the next burst.
"""
import math
import struct
import wave

SR = 44100
DURATION = 12.0  # seconds (well under the 30s iOS limit)
CYCLE = 1.4      # one chime motif, matching CYCLE_SEC.chime
# (frequencyHz, startSec, durationSec) — matches PATTERNS.chime
NOTES = [(880.0, 0.0, 0.4), (1320.0, 0.45, 0.5)]


def env(t, dur):
    """Soft attack, exponential decay — a struck-chime shape."""
    attack = 0.02
    if t < attack:
        return t / attack
    return math.exp(-3.2 * (t - attack) / max(dur - attack, 1e-4))


def sample(t):
    cycle_t = t % CYCLE
    swell = min(0.9, 0.15 + (t / 30.0) * 0.75)  # mirror the in-app ramp
    v = 0.0
    for freq, start, dur in NOTES:
        if start <= cycle_t < start + dur:
            lt = cycle_t - start
            v += math.sin(2 * math.pi * freq * lt) * env(lt, dur)
    return v * swell * 0.5


def main():
    n = int(SR * DURATION)
    frames = bytearray()
    # Global fade-out over the last 0.4s to avoid a click at the tail.
    fade = int(SR * 0.4)
    for i in range(n):
        t = i / SR
        s = sample(t)
        if i > n - fade:
            s *= (n - i) / fade
        frames += struct.pack('<h', int(max(-1.0, min(1.0, s)) * 32767))
    with wave.open('madoromi_alarm.wav', 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(frames))
    print('wrote madoromi_alarm.wav', n, 'frames')


if __name__ == '__main__':
    main()
