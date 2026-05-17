import { extractParams } from "./seed";

// Tone.js and ffmpeg are lazy-loaded inside async functions — never at module level.

const SAMPLE_RATE = 8000;
const DURATION = 1.0;
const NUM_SAMPLES = Math.ceil(SAMPLE_RATE * DURATION);
const REVERB_DECAY = 0.5;

// ── Seeded PRNG (mulberry32) ───────────────────────────────────────────────────
// Tone.Noise and Tone.Reverb use Math.random() internally, making them
// non-deterministic. We replace both with seeded equivalents.

function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = (Math.imul(s ^ (s >>> 15), 1 | s)) >>> 0;
    z = (Math.imul(z ^ (z >>> 7), 0x61 | z)) >>> 0;
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  };
}

function readUint32BE(hex: string, byteOffset: number): number {
  return (parseInt(hex.slice(byteOffset * 2, byteOffset * 2 + 8), 16) >>> 0);
}

function seededNoise(seedHex: string): Float32Array {
  const prng = makePrng(readUint32BE(seedHex.slice(2), 0));
  const buf = new Float32Array(NUM_SAMPLES);
  for (let i = 0; i < NUM_SAMPLES; i++) buf[i] = prng() * 2 - 1;
  return buf;
}

function seededReverbIR(seedHex: string): Float32Array {
  const prng = makePrng(readUint32BE(seedHex.slice(2), 24));
  const len = Math.ceil(REVERB_DECAY * SAMPLE_RATE);
  const ir = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    ir[i] = (prng() * 2 - 1) * Math.exp((-i / SAMPLE_RATE) * 3);
  }
  return ir;
}

// ── Synthesis via Tone.js OfflineContext ───────────────────────────────────────

async function synthesize(seed: `0x${string}`): Promise<AudioBuffer> {
  const Tone = await import("tone");
  const p = extractParams(seed);

  const offline = new Tone.OfflineContext(1, DURATION, SAMPLE_RATE);
  if (offline.sampleRate !== SAMPLE_RATE) {
    console.warn(
      `OfflineContext sample rate mismatch: requested ${SAMPLE_RATE}, got ${offline.sampleRate}`
    );
  }
  Tone.setContext(offline);

  const osc = new Tone.Oscillator({ type: p.oscType, frequency: p.frequency });
  const env = new Tone.AmplitudeEnvelope({
    attack: p.attack,
    decay: p.decay,
    sustain: p.sustain,
    release: p.release,
  });

  // Use Convolver + seeded IR instead of Tone.Reverb (which uses Math.random())
  const convolver = new Tone.Convolver(Tone.ToneAudioBuffer.fromArray(seededReverbIR(seed)));

  const dryGain = new Tone.Gain(1 - p.reverbWet);
  const wetGain = new Tone.Gain(p.reverbWet);

  osc.connect(env);
  env.connect(dryGain);
  env.connect(convolver);
  convolver.connect(wetGain);
  dryGain.toDestination();
  wetGain.toDestination();

  osc.start(0);
  env.triggerAttackRelease(0.8, 0);

  const toneBuffer = await offline.render();
  const audioBuffer = toneBuffer.get()!; // unwrap ToneAudioBuffer → AudioBuffer

  // Add seeded noise to PCM instead of using Tone.Noise (which uses Math.random())
  const channel = audioBuffer.getChannelData(0);
  const noise = seededNoise(seed);
  for (let i = 0; i < channel.length; i++) {
    channel[i] = Math.max(-1, Math.min(1, channel[i] + noise[i] * p.noiseFloor));
  }

  return audioBuffer;
}

// ── AudioBuffer → 16-bit WAV ───────────────────────────────────────────────────

function audioBufferToWav(audioBuffer: AudioBuffer): Uint8Array {
  const pcm = audioBuffer.getChannelData(0);
  const n = pcm.length;
  const ab = new ArrayBuffer(44 + n * 2);
  const view = new DataView(ab);

  view.setUint32(0, 0x52494646, false); // 'RIFF'
  view.setUint32(4, 36 + n * 2, true);
  view.setUint32(8, 0x57415645, false); // 'WAVE'
  view.setUint32(12, 0x666d7420, false); // 'fmt '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  view.setUint32(36, 0x64617461, false); // 'data'
  view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), true);
  }

  return new Uint8Array(ab);
}

// ── OGG serial patching for determinism ────────────────────────────────────────
// OGG bitstream serial number is random per encode; we replace it with a
// value derived from the seed so identical inputs produce identical bytes.

// OGG CRC32: unreflected, poly 0x04c11db7, init 0 — matches xiph.org reference.
const OGG_CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) r = ((r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1)) >>> 0;
    t[i] = r;
  }
  return t;
})();

function crc32ogg(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) crc = ((crc << 8) ^ OGG_CRC_TABLE[((crc >>> 24) ^ byte) & 0xff]) >>> 0;
  return crc;
}

function patchOggSerial(ogg: Uint8Array, serial: number): Uint8Array {
  const out = new Uint8Array(ogg);
  const view = new DataView(out.buffer);
  let offset = 0;
  while (offset + 27 <= out.length) {
    if (view.getUint32(offset, false) !== 0x4f676753) break; // 'OggS'
    view.setUint32(offset + 14, serial, true);
    view.setUint32(offset + 22, 0, true); // zero CRC before recalculating
    const nsegs = out[offset + 26];
    let pageEnd = offset + 27 + nsegs;
    for (let s = 0; s < nsegs; s++) pageEnd += out[offset + 27 + s];
    const slice = out.slice(offset, pageEnd);
    view.setUint32(offset + 22, crc32ogg(slice), true);
    offset = pageEnd;
  }
  return out;
}

// ── OGG encoding via ffmpeg.wasm ───────────────────────────────────────────────

let ffmpegInstance: import("@ffmpeg/ffmpeg").FFmpeg | null = null;

export function preloadEncoder(): void {
  loadFfmpeg().catch(() => {});
}

async function loadFfmpeg(): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const ff = new FFmpeg();
  // Uses default CDN URLs from @ffmpeg/ffmpeg (unpkg @ffmpeg/core@0.12.9).
  // Next.js must serve with COOP + COEP headers for SharedArrayBuffer support.
  await ff.load();
  ffmpegInstance = ff;
  return ff;
}

async function encodeToOgg(audioBuffer: AudioBuffer, seed: `0x${string}`): Promise<Uint8Array> {
  const ff = await loadFfmpeg();
  const wav = audioBufferToWav(audioBuffer);

  await ff.writeFile("input.wav", wav);
  await ff.exec([
    "-i", "input.wav",
    "-c:a", "libvorbis",
    "-qscale:a", "0",
    "-ar", String(SAMPLE_RATE),
    "-ac", "1",
    "output.ogg",
  ]);
  const raw = await ff.readFile("output.ogg") as Uint8Array;
  await ff.deleteFile("input.wav");
  await ff.deleteFile("output.ogg");

  // Patch serial number with a deterministic value from the seed (bytes 0–3)
  const serial = readUint32BE(seed.slice(2), 0);
  return patchOggSerial(raw, serial);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function generateAudio(seed: `0x${string}`): Promise<Uint8Array> {
  const audioBuffer = await synthesize(seed);
  const audioBytes = await encodeToOgg(audioBuffer, seed);
  if (audioBytes.length > 15000) {
    throw new Error(`audio too large: ${audioBytes.length} bytes (max 15000)`);
  }
  return audioBytes;
}

export async function decodeOgg(oggBytes: Uint8Array): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(oggBytes.slice().buffer);
  } finally {
    await ctx.close();
  }
}
