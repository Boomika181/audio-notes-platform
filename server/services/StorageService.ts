import path from 'path';
import { supabaseAdmin } from '../lib/supabase';

const BUCKET_NAME = 'audio-notes';

export class StorageService {
  static async uploadAudio(file: Buffer, fileName: string, mimeType: string) {
    const timestamp = Date.now();
    const basename = path.basename(fileName);
    const safeFileName = basename.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
    const filePath = `uploads/${timestamp}_${safeFileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: false
      });

    if (error) throw error;
    return data.path;
  }

  static async getSignedUrl(filePath: string) {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hour expiration
    
    if (error) throw error;
    return data.signedUrl;
  }

  static async deleteAudio(filePath: string) {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) throw error;
  }
}

