import axios from 'axios';
import FormData from 'form-data';
import { supabaseAdmin } from '../lib/supabase';
import { withRetry } from '../utils/retry';
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
   * Transcribe audio using Gnani.ai v3 API
   */
  static async transcribe(storagePath: string, languageCode = 'en-IN'): Promise<string> {
    const apiKey = Config.GNANI_API_KEY;
    if (!apiKey) {
      throw new Error('GNANI_API_KEY is not configured');
    }

    return withRetry(async () => {
      console.log(`[GnaniService][TRANSCRIPTION_ATTEMPT] ${storagePath}`);

      // 1. Download file from Supabase Storage
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

      // 3. Process each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const formData = new FormData();

        formData.append('audio_file', chunk.buffer, {
          filename: chunk.filename,
          contentType: chunk.contentType
        });
        formData.append('language_code', languageCode);
        formData.append('preferred_language', preferredLanguage);
        formData.append('format', 'transcribe');
        formData.append('itn_native_numerals', 'true');

        let response;
        try {
          response = await axios.post('https://api.vachana.ai/stt/v3', formData, {
            headers: {
              ...formData.getHeaders(),
              'X-API-Key-ID': apiKey
            },
            timeout: 90000 
          });
        } catch (err: any) {
          const status = err.response?.status;
          const data = err.response?.data;
          const safeBody = typeof data === 'object' ? JSON.stringify(data) : (data || err.message);
          console.error(`[GnaniService][ERROR] Chunk ${i + 1}/${chunks.length} failed. HTTP Status: ${status ?? 'N/A'}. Gnani Response: ${safeBody}`);
          throw err;
        }

        const resData = response.data;
        const partTranscript = resData?.transcript || resData?.result?.transcript || resData?.data?.transcript || resData?.text;
        
        if (partTranscript && typeof partTranscript === 'string' && partTranscript.trim().length > 0) {
          transcripts.push(partTranscript.trim());
        } else if (resData && resData.success === false) {
          const safeBody = typeof resData === 'object' ? JSON.stringify(resData) : resData;
          console.error(`[GnaniService][ERROR] Chunk ${i + 1}/${chunks.length} returned success=false. Gnani Response: ${safeBody}`);
          throw new Error(resData.message || resData.error || `Gnani STT returned failure status on chunk ${i+1}`);
        }
      }

      const fullTranscript = transcripts.join(' ').trim();
      if (fullTranscript.length > 0) {
        return fullTranscript;
      }

      throw new Error('No valid transcript returned from Gnani STT API');
    }, {
      onRetry: (error, attempt) => {
        const status = error.response?.status;
        const data = error.response?.data;
        const safeBody = typeof data === 'object' ? JSON.stringify(data) : (data || error.message);
        console.warn(`[GnaniService][RETRY] Attempt ${attempt} failed with HTTP Status: ${status ?? 'N/A'}. Details: ${safeBody}`);
      }
    });
  }
}

