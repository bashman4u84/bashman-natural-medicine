#!/usr/bin/env python3
"""Build the soundtrack + full mix for the Bashman hepatitis B ad."""
import wave, os, math, sys
import numpy as np

SR = 44100
DUR = 59.5
N = int(SR * DUR)
OUT = 'audio'
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------ helpers
def rd(path):
    """read a wav -> (float32 stereo array, samplerate)"""
    with wave.open(path, 'rb') as w:
        n, ch, sr, sw = w.getnframes(), w.getnchannels(), w.getframerate(), w.getsampwidth()
        raw = w.readframes(n)
    if sw == 2:
        a = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0
    elif sw == 3:
        b = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
        v = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
        v = np.where(v & 0x800000, v - 0x1000000, v)
        a = v.astype(np.float32) / 8388608.0
    else:
        a = np.frombuffer(raw, dtype='<i4').astype(np.float32) / 2147483648.0
    if ch == 2:
        a = a.reshape(-1, 2)
    else:
        a = np.repeat(a.reshape(-1, 1), 2, axis=1)
    if sr != SR:                                   # linear resample (not needed here, safety)
        idx = np.linspace(0, len(a) - 1, int(len(a) * SR / sr))
        a = np.stack([np.interp(idx, np.arange(len(a)), a[:, c]) for c in range(2)], axis=1).astype(np.float32)
    return a

def wr(path, a):
    a = np.clip(a, -1.0, 1.0)
    pcm = (a * 32767.0).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())

def db(x): return 10 ** (x / 20.0)

def rms(a):
    return float(np.sqrt(np.mean(a ** 2)) + 1e-12)

def place(bus, clip, t, gain=1.0):
    i = int(round(t * SR))
    if i < 0:
        clip = clip[-i:]
        i = 0
    if i >= len(bus) or len(clip) == 0: return
    n = min(len(clip), len(bus) - i)
    if n <= 0: return
    bus[i:i + n] += clip[:n] * gain

def env_ad(n, atk, rel, hold_ratio=0.7):
    """simple attack/release envelope of n samples"""
    e = np.ones(n, dtype=np.float32)
    a = min(int(atk * SR), n // 2)
    r = min(int(rel * SR), n - a)
    if a > 1: e[:a] = np.linspace(0, 1, a) ** 1.6
    if r > 1: e[n - r:] = np.linspace(1, 0, r) ** 1.6
    return e

def lowpass(x, cutoff, order=2):
    """zero-phase-ish one-pole cascade (forward+backward)"""
    a = math.exp(-2 * math.pi * cutoff / SR)
    y = x.copy()
    for _ in range(order):
        out = np.empty_like(y); acc = 0.0
        for i in range(len(y)):
            acc = (1 - a) * y[i] + a * acc
            out[i] = acc
        y = out
    return y

def lowpass_fast(x, cutoff, order=2):
    """FFT brickwall-ish lowpass (fast, good enough)"""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    H = 1.0 / (1.0 + (f / cutoff) ** (2 * order))
    return np.fft.irfft(X * H, n=len(x))

def note(name):
    """note name -> frequency, e.g. D2, Bb3, F#4"""
    base = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    i = 1
    semis = 0
    if len(name) > 1 and name[1] in 'b#':
        semis = -1 if name[1] == 'b' else 1
        i = 2
    pitch = base[name[0]] + semis
    octv = int(name[i:])
    midi = 12 * (octv + 1) + pitch
    return 440.0 * 2 ** ((midi - 69) / 12)

# ------------------------------------------------------------------ instrument: bowed pad voice
def pad_voice(f, dur, amp=1.0, detune=0.004, partials=(1, 2, 3, 4, 6), pans=(0.0, 0.0)):
    n = int(dur * SR)
    t = np.arange(n) / SR
    # slow vibrato + drift for a living, organic tone
    vib = 1.0 + 0.0016 * np.sin(2 * np.pi * 0.21 * t) + 0.0009 * np.sin(2 * np.pi * 0.13 * t + 1.1)
    L = np.zeros(n, dtype=np.float64); R = np.zeros(n, dtype=np.float64)
    for k, p in enumerate(partials):
        pa = amp / (p ** 1.75)
        for side, off in ((0, -detune), (1, +detune)):
            fr = f * p * (1 + off)
            ph = np.random.rand() * 2 * np.pi
            v = np.sin(2 * np.pi * fr * vib * t + ph) * pa
            if side == 0: L += v
            else:         R += v
    # gentle stereo widening + tremolo
    trem = 1.0 - 0.10 * np.sin(2 * np.pi * 0.17 * t + 0.4)
    L *= trem; R *= trem
    e = env_ad(n, dur * 0.42, dur * 0.45)
    return np.stack([L * e, R * e], axis=1).astype(np.float32)

def bell(f, dur, amp=0.5, pan=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    v = (np.sin(2 * np.pi * f * t) * 1.0 +
         np.sin(2 * np.pi * f * 2.02 * t) * 0.36 +
         np.sin(2 * np.pi * f * 3.01 * t) * 0.16 +
         np.sin(2 * np.pi * f * 4.98 * t) * 0.07)
    e = np.exp(-t * 2.6) * env_ad(n, 0.006, 0.05)
    v = v * e * amp
    gl = v * (1 - max(0, pan)); gr = v * (1 + min(0, pan))
    return np.stack([gl, gr], axis=1).astype(np.float32)

def boom(f=58.0, dur=2.4, amp=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    v = np.sin(2 * np.pi * f * np.exp(-t * 0.55) * t) * np.exp(-t * 2.1)
    v += np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 4.2) * 0.35
    v *= amp
    return np.stack([v, v], axis=1).astype(np.float32)

def swell(dur=3.4, amp=0.24, seed=0):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    noise = rng.standard_normal(n).astype(np.float32)
    noise = lowpass_fast(noise, 5200, 1)
    hp = noise - lowpass_fast(noise, 900, 2)
    t = np.arange(n) / SR
    e = np.sin(np.pi * (t / dur) ** 0.85) ** 2
    v = hp * e * amp
    return np.stack([v, np.roll(v, 90)], axis=1).astype(np.float32)

# ------------------------------------------------------------------ the score
print('  composing score...')
music = np.zeros((N, 2), dtype=np.float32)

# -- chord bed, 2 bars of 9.5s-ish aligned to the scene structure
#    (start, dur, notes, amp)
CHORDS = [
    (0.0,  13.9, ['D2', 'A2', 'D3', 'F3', 'A3'],        0.170),   # 1-3 dark, unresolved Dm
    (13.9,  5.8, ['Bb2', 'F3', 'Bb3', 'D4'],            0.190),   # 4 the turn — warm Bb
    (19.7,  5.6, ['F2', 'C3', 'F3', 'A3', 'C4'],        0.180),   # 5 protocol — F
    (25.3, 19.0, ['C3', 'G3', 'C4', 'E4'],              0.130),   # 6-7 proof — C, held back
    (44.3,  5.5, ['F2', 'C3', 'F3', 'A3', 'C4'],        0.200),   # 8 testimonies — F
    (49.8,  4.1, ['G2', 'D3', 'G3', 'B3', 'D4'],        0.200),   # 9 care — G (lift)
    (53.9,  5.6, ['D3', 'A3', 'D4', 'F#4', 'A4'],       0.215),   # 10 CTA — D major (Picardy resolution)
]
for start, dur, notes, amp in CHORDS:
    for i, nm in enumerate(notes):
        f = note(nm)
        a = amp * (1.0 - 0.10 * i)
        p = pad_voice(f, dur + 1.4, amp=a, detune=0.0035 + 0.0008 * i,
                      partials=(1, 2, 3, 5), pans=(0, 0))
        place(music, p, start - 0.7)

# -- sub bass movement
for start, dur, nm, amp in [(0.0, 13.9, 'D2', .16), (13.9, 5.8, 'Bb1', .17),
                            (19.7, 5.6, 'F2', .15), (25.3, 19.0, 'C2', .12),
                            (44.3, 5.5, 'F2', .17), (49.8, 4.1, 'G2', .17),
                            (53.9, 5.6, 'D2', .19)]:
    p = pad_voice(note(nm), dur + 1.2, amp=amp, detune=0.0012, partials=(1, 2), pans=(0, 0))
    place(music, p, start - 0.6)

# -- heartbeat pulse: two soft thumps every 2.4s, only in the "problem" half
def heartbeat(t0, amp=0.30):
    n = int(0.9 * SR); t = np.arange(n) / SR
    v = np.sin(2 * np.pi * 62 * t) * np.exp(-t * 9) * amp
    v2 = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 11) * amp * 0.62
    v[int(0.30 * SR):] += v2[:n - int(0.30 * SR)]
    return np.stack([v, v], axis=1).astype(np.float32)

for k in range(0, 12):
    t0 = 0.5 + k * 2.4
    place(music, heartbeat(t0, 0.26 if t0 < 13.9 else 0.17), t0)

# -- gentle arpeggio sparkle in the resolution sections
rng = np.random.default_rng(7)
ARP = [(13.9, ['Bb3', 'D4', 'F4', 'Bb4'], 0.9), (19.7, ['F3', 'A3', 'C4', 'F4'], 0.85),
       (44.3, ['F3', 'A3', 'C4', 'F4', 'A4'], 0.62), (49.8, ['G3', 'B3', 'D4', 'G4'], 0.62),
       (53.9, ['D4', 'F#4', 'A4', 'D5'], 0.60)]
for start, notes, step in ARP:
    for i, nm in enumerate(notes):
        place(music, bell(note(nm), 3.4, amp=0.100 + 0.012 * i, pan=(-0.35 + 0.20 * i)), start + i * step)

# -- transitions: swell + boom
for t0, sw, bm in [(0.0, 0.30, 0.34), (13.75, 0.26, 0.40), (25.15, 0.22, 0.34),
                   (27.55, 0.30, 0.46), (44.15, 0.26, 0.40), (49.65, 0.20, 0.32),
                   (53.75, 0.28, 0.44)]:
    place(music, swell(3.4, sw, seed=int(t0 * 100)), max(0.0, t0 - 2.6))
    place(music, boom(56 + 6 * ((t0 * 7) % 3), 2.6, bm), t0)

# -- airy noise floor
air = rng.standard_normal(N).astype(np.float32) * 0.0045
air = lowpass_fast(air, 2600, 2)
music += np.stack([air, np.roll(air, 177)], axis=1)

# -- simple convolution reverb (exponentially decaying noise IR)
ir_len = int(2.0 * SR)
t_ir = np.arange(ir_len) / SR
ir = rng.standard_normal(ir_len).astype(np.float32) * np.exp(-t_ir * 3.0)
ir = lowpass_fast(ir, 4200, 2); ir /= np.sqrt(np.sum(ir ** 2))
wet = np.stack([np.convolve(music[:, 0], ir, mode='full')[:N],
                np.convolve(music[:, 1], ir, mode='full')[:N]], axis=1).astype(np.float32)
music = music * 0.72 + wet * 0.40

# gentle top-end softening
music = np.stack([lowpass_fast(music[:, 0], 9000, 2), lowpass_fast(music[:, 1], 9000, 2)], axis=1)

# normalise the bed
music *= db(-19.0) / rms(music)
print(f'  score rms {rms(music):.4f}')

# ------------------------------------------------------------------ build the mix
print('  mixing...')
bus = music.copy()

VO = {
    's1_hook':        0.60,
    's2_symptoms':    3.80,
    's3_wait':       10.10,
    's4_turn':       14.30,
    's5_protocol':   20.10,
    's6_intro':      25.60,
    's7_testimonies':44.60,
    's8_care':       50.00,
    's9_cta':        54.20,
}
vo_bus = np.zeros((N, 2), dtype=np.float32)
for name, t0 in VO.items():
    clip = rd(f'vo/trim/{name}.wav')
    vo_bus_ = clip
    place(vo_bus, vo_bus_, t0)
    print(f'    VO {name:16s} @ {t0:5.2f}s  len {len(clip)/SR:5.2f}s')

vo_bus *= db(-15.5) / rms(vo_bus[vo_bus.any(axis=1)]) if vo_bus.any() else 1.0

# testimonial voice-over (kept natural, it is the proof)
proof = rd('video/proof.wav')
proof_bus = np.zeros((N, 2), dtype=np.float32)
place(proof_bus, proof, 27.70)
proof_bus *= db(-16.5) / rms(proof_bus[proof_bus.any(axis=1)])

# --- ducking: music gives way to speech
def duck_env(speech, attack=0.22, release=0.55, floor=0.20):
    act = (np.abs(speech).max(axis=1) > 0.012).astype(np.float32)
    # smooth the activity into a gain envelope
    k = 1 - math.exp(-1 / (SR * 0.09))
    env = np.empty_like(act); acc = 0.0
    for i in range(len(act)):
        acc += k * (act[i] - acc); env[i] = acc
    g = 1.0 - (1.0 - floor) * np.clip(env * 1.35, 0, 1)
    # extra dip under the testimonial segment
    i0, i1 = int(26.9 * SR), int(45.0 * SR)
    g[i0:i1] = np.minimum(g[i0:i1], 0.34)
    return np.stack([g, g], axis=1)

speech = vo_bus + proof_bus
bus *= duck_env(speech)

bus += vo_bus * 0.98
bus += proof_bus * 0.95

# ------------------------------------------------------------------ master
# gentle bus compression + soft limiter
def compress(x, thr=0.30, ratio=3.0, atk=0.012, rel=0.22):
    det = np.abs(x).max(axis=1)
    k_a = 1 - math.exp(-1 / (SR * atk)); k_r = 1 - math.exp(-1 / (SR * rel))
    env = np.empty_like(det); acc = 0.0
    for i in range(len(det)):
        k = k_a if det[i] > acc else k_r
        acc += k * (det[i] - acc); env[i] = acc
    over = np.maximum(env - thr, 0.0)
    gain = thr / (thr + over * (ratio - 1) / ratio + 1e-9)
    gain = np.where(env > thr, gain, 1.0)
    return x * gain[:, None]

bus = compress(bus, thr=0.34, ratio=2.6)
bus *= db(-3.0) / max(np.abs(bus).max(), 1e-9)
# soft clip
bus = np.tanh(bus * 1.12) / np.tanh(1.12)
bus *= 0.94

wr(f'{OUT}/final_mix.wav', bus)
print(f'  master peak {np.abs(bus).max():.3f}  rms {rms(bus):.4f} ({20*math.log10(rms(bus)):.1f} dBFS)')
print('done ->', f'{OUT}/final_mix.wav')
