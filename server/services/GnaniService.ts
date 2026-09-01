import axios from 'axios';
import FormData from 'form-data';
import { supabaseAdmin } from '../lib/supabase';
import { Config } from '../lib/config';

export class GnaniService {
  private static BUCKET_NAME = 'audio-notes';

  /**
   * Split audio buffer into chunks of <=25 seconds duration to respect Gnani.ai STT 30s limit
   */
  private static chunkAudioBuffer(
    buffer: Buffer,
    ext: string,
    contentType: string
  ): { buffer: Buffer; contentType: string; filename: string }[] {
    const CHUNK_DURATION = 25; // 25 seconds per chunk

    // Handle WAV format with header reconstruction
    if (ext === 'wav' || contentType.includes('wav')) {
      if (buffer.length > 44 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
        const byteRate = buffer.readUInt32LE(28);
        const channels = buffer.readUInt16LE(22);
        const sampleRate = buffer.readUInt32LE(24);
        const bitsPerSample = buffer.readUInt16LE(34);
        const blockAlign = buffer.readUInt16LE(32);

        if (byteRate > 0 && blockAlign > 0) {
          const pcmData = buffer.subarray(44);
          const totalDuration = pcmData.length / byteRate;

          // If <= 30 seconds, return original
          if (totalDuration <= 30) {
            return [{ buffer, contentType: 'audio/wav', filename: 'audio_0.wav' }];
          }

          const bytesPerChunk = Math.floor((CHUNK_DURATION * byteRate) / blockAlign) * blockAlign;
          const chunks: { buffer: Buffer; contentType: string; filename: string }[] = [];

          for (let offset = 0, index = 0; offset < pcmData.length; offset += bytesPerChunk, index++) {
            const slice = pcmData.subarray(offset, offset + bytesPerChunk);
            
            // Build valid WAV header for this slice
            const header = Buffer.alloc(44);
            header.write('RIFF', 0);
            header.writeUInt32LE(36 + slice.length, 4);
            header.write('WAVE', 8);
            header.write('fmt ', 12);
            header.writeUInt32LE(16, 16);
            header.writeUInt16LE(1, 20); // PCM
            header.writeUInt16LE(channels, 22);
            header.writeUInt32LE(sampleRate, 24);
            header.writeUInt32LE(byteRate, 28);
            header.writeUInt16LE(blockAlign, 32);
            header.writeUInt16LE(bitsPerSample, 34);
            header.write('data', 36);
            header.writeUInt32LE(slice.length, 40);

            const chunkWav = Buffer.concat([header, slice]);
            chunks.push({
              buffer: chunkWav,
              contentType: 'audio/wav',
              filename: `audio_${index}.wav`
            });
          }

          return chunks;
        }
      }
    }

    // For compressed formats (MP3/M4A), chunk by size (~400KB <= 25s at 128kbps)
    const maxChunkBytes = 400 * 1024;
    if (buffer.length <= maxChunkBytes) {
      return [{ buffer, contentType, filename: `audio_0.${ext || 'mp3'}` }];
    }

    const chunks: { buffer: Buffer; contentType: string; filename: string }[] = [];
    for (let offset = 0, index = 0; offset < buffer.length; offset += maxChunkBytes, index++) {
      const slice = buffer.subarray(offset, offset + maxChunkBytes);
      chunks.push({
        buffer: slice,
        contentType,
        filename: `audio_${index}.${ext || 'mp3'}`
      });
    }

    return chunks;
  }

  /**
   * Transcribe audio using Gnani.ai v3 API with per-chunk retry, rate-limit backoff, and pacing
   */
  static async transcribe(storagePath: string, languageCode = 'en-IN'): Promise<string> {
    const apiKey = Config.GNANI_API_KEY;
    if (!apiKey) {
      throw new Error('GNANI_API_KEY is not configured');
    }

    console.log(`[GnaniService][TRANSCRIPTION_START] ${storagePath}`);

    // 1. Download file from Supabase Storage once
    const { data, error } = await supabaseAdmin.storage
      .from(this.BUCKET_NAME)
      .download(storagePath);

    if (error) throw error;
    if (!data) throw new Error('Could not download audio file from storage');

    // 2. Prepare audio buffer & chunks
    const buffer = Buffer.from(await data.arrayBuffer());
    const preferredLanguage = languageCode === 'hi-IN' ? 'hindi' : 'english';
    const filename = storagePath.split('/').pop() || 'audio.mp3';
    const ext = filename.split('.').pop()?.toLowerCase() || 'mp3';
    const contentType = ext === 'wav' ? 'audio/wav' : ext === 'm4a' ? 'audio/m4a' : 'audio/mpeg';

    const chunks = this.chunkAudioBuffer(buffer, ext, contentType);
    console.log(`[GnaniService] Processing ${chunks.length} audio chunk(s) for ${storagePath}`);

    const transcripts: string[] = [];
    const MAX_CHUNK_RETRIES = 4; // 1 initial attempt + 3 retries
    const INTER_CHUNK_DELAY_MS = 1000; // 1s pacing between successful chunks to prevent bursting

    // 3. Process each chunk sequentially with individual retry & backoff
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let chunkTranscript: string | null = null;
      let lastChunkError: any = null;

      for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
        const formData = new FormData();
        formData.append('audio_file', chunk.buffer, {
          filename: chunk.filename,
          contentType: chunk.contentType
        });
        formData.append('language_code', languageCode);
        formData.append('preferred_language', preferredLanguage);
        formData.append('format', 'transcribe');
        formData.append('itn_native_numerals', 'true');

        let isAppError = false;
        try {
          const response = await axios.post('https://api.vachana.ai/stt/v3', formData, {
            headers: {
              ...formData.getHeaders(),
              'X-API-Key-ID': apiKey
            },
            timeout: 90000
          });

          const resData = response.data;
          const partTranscript = resData?.transcript || resData?.result?.transcript || resData?.data?.transcript || resData?.text;

          if (partTranscript && typeof partTranscript === 'string' && partTranscript.trim().length > 0) {
            chunkTranscript = partTranscript.trim();
            break; // Chunk succeeded
          } else if (resData && resData.success === false) {
            const safeBody = typeof resData === 'object' ? JSON.stringify(resData) : resData;
            console.error(`[GnaniService][ERROR] Chunk ${i + 1}/${chunks.length} returned success=false. Gnani Response: ${safeBody}`);
            isAppError = true;
            throw new Error(resData.message || resData.error || `Gnani STT returned failure status on chunk ${i + 1}`);
          } else {
            // Empty transcript or unhandled structure
            chunkTranscript = '';
            break;
          }
        } catch (err: any) {
          lastChunkError = err;
          const status = err.response?.status;
          const is429 = status === 429;
          const data = err.response?.data;
          const safeBody = typeof data === 'object' ? JSON.stringify(data) : (data || err.message);

          if (!isAppError) {
            console.error(
              `[GnaniService][ERROR] Chunk ${i + 1}/${chunks.length} attempt ${attempt}/${MAX_CHUNK_RETRIES} failed. ` +
              `HTTP Status: ${status ?? 'N/A'}. is429: ${is429}. Gnani Response: ${safeBody}`
            );
          }

          // Do not retry explicit application errors or non-retriable HTTP client errors (400, 401, 403, 404)
          if (isAppError || (status && status < 500 && !is429)) {
            throw err;
          }

          // If reached max retries, stop and throw
          if (attempt === MAX_CHUNK_RETRIES) {
            break;
          }

          // Calculate backoff delay
          let delayMs = 1500 * Math.pow(2, attempt - 1); // 1.5s, 3s, 6s base
          if (is429) {
            // Specialized 429 backoff: check Retry-After header or use larger exponential backoff with jitter
            const retryAfterHeader = err.response?.headers?.['retry-after'];
            if (retryAfterHeader) {
              const parsedSeconds = parseInt(retryAfterHeader, 10);
              if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
                delayMs = parsedSeconds * 1000;
              }
            } else {
              // 429 backoff: 2s, 4s, 8s + jitter (up to 500ms)
              delayMs = 2000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
            }
          }

          console.warn(
            `[GnaniService][RETRY] Chunk ${i + 1}/${chunks.length} retrying in ${delayMs}ms ` +
            `(next attempt: ${attempt + 1}/${MAX_CHUNK_RETRIES}, HTTP Status: ${status ?? 'N/A'}, is429: ${is429})`
          );

          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      if (chunkTranscript === null) {
        throw new Error(
          `Gnani STT failed on chunk ${i + 1}/${chunks.length} after ${MAX_CHUNK_RETRIES} attempts: ${lastChunkError?.message || 'Unknown error'}`
        );
      }

      if (chunkTranscript.length > 0) {
        transcripts.push(chunkTranscript);
      }

      // Pacing delay between successful chunks to prevent burst rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, INTER_CHUNK_DELAY_MS));
      }
    }

    const fullTranscript = transcripts.join(' ').trim();
    if (fullTranscript.length > 0) {
      console.log(`[GnaniService][TRANSCRIPTION_SUCCESS] Completed ${chunks.length} chunk(s) for ${storagePath}`);
      return fullTranscript;
    }

    throw new Error('No valid transcript returned from Gnani STT API');
  }
}

