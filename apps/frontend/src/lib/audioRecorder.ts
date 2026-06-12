/**
 * Records candidate answers as 16-bit PCM WAV via Web Audio API.
 * WAV (not MediaRecorder/webm) because the STT endpoint only accepts RIFF files.
 * Captures at 16kHz mono to keep uploads small (~2MB/min).
 * Reuses one mic stream across questions; exposes a 0-1 volume level for UI meters.
 */
const SAMPLE_RATE = 16000;

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levelData: Uint8Array<ArrayBuffer> | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private recording = false;

  get mimeType(): string {
    return 'audio/wav';
  }

  async init(): Promise<void> {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = this.audioContext.createMediaStreamSource(this.stream);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    this.levelData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      if (!this.recording) return;
      this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(this.processor);
    // ScriptProcessor must be connected to a destination to fire events
    this.processor.connect(this.audioContext.destination);
  }

  start(): void {
    if (!this.processor) throw new Error('AudioRecorder not initialized — call init() first');
    this.chunks = [];
    this.recording = true;
    this.audioContext?.resume().catch(() => undefined);
  }

  get isRecording(): boolean {
    return this.recording;
  }

  stop(): Promise<Blob> {
    if (!this.recording) return Promise.reject(new Error('Not recording'));
    this.recording = false;
    const sampleRate = this.audioContext?.sampleRate ?? SAMPLE_RATE;
    return Promise.resolve(encodeWav(this.chunks, sampleRate));
  }

  /** Current mic volume, 0-1. Returns 0 before init. */
  getLevel(): number {
    if (!this.analyser || !this.levelData) return 0;
    this.analyser.getByteFrequencyData(this.levelData);
    let sum = 0;
    for (let i = 0; i < this.levelData.length; i++) sum += this.levelData[i];
    return sum / this.levelData.length / 255;
  }

  destroy(): void {
    this.recording = false;
    this.processor?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close().catch(() => undefined);
    this.stream = null;
    this.processor = null;
    this.analyser = null;
    this.audioContext = null;
  }
}

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const totalSamples = chunks.reduce((sum, c) => sum + c.length, 0);
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const s = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
