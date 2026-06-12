/**
 * Round-trip smoke test for TtsService + SttService.
 * TTS reads a sentence -> saves MP3 -> STT transcribes that MP3 back.
 *
 * Usage (from apps/backend): pnpm tsx scripts/smoke-tts-stt.ts
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { ConfigService } from '@nestjs/config';
import { writeFileSync } from 'fs';
import { TtsService } from '../src/tts/tts.service';
import { SttService } from '../src/stt/stt.service';

async function main() {
  const config = new ConfigService(); // reads process.env (populated by dotenv above)
  const tts = new TtsService(config);
  const stt = new SttService(config);

  const text = 'Xin chào, đây là bài kiểm tra tổng hợp giọng nói cho buổi phỏng vấn.';

  console.log('\n[1/2] TTS: synthesizing →', JSON.stringify(text));
  const t0 = Date.now();
  const audio = await tts.synthesize(text);
  const outFile = `/tmp/smoke-tts.${tts.audioFormat.extension}`;
  writeFileSync(outFile, audio);
  console.log(`      OK — ${audio.length} bytes in ${Date.now() - t0}ms → ${outFile} (mở nghe thử được)`);

  console.log('\n[2/2] STT: transcribing the generated audio...');
  const t1 = Date.now();
  const transcript = await stt.transcribe(audio, `smoke-tts.${tts.audioFormat.extension}`, 'vi');
  console.log(`      OK — ${Date.now() - t1}ms`);
  console.log('      Original  :', text);
  console.log('      Transcript:', transcript);
}

main().catch((err) => {
  console.error('\nSMOKE TEST FAILED:', err?.message ?? err);
  if (err?.status) console.error('HTTP status:', err.status);
  process.exit(1);
});
