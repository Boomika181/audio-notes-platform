import { supabaseAdmin } from '../lib/supabase';
import { AudioNote } from '../../src/types';

export class DatabaseService {
  static async createNote(note: Partial<AudioNote>) {
    const { data, error } = await supabaseAdmin
      .from('audio_notes')
      .insert([note])
      .select()
      .single();

    if (error) throw error;
    return data as AudioNote;
  }

  static async updateNote(id: string, updates: Partial<AudioNote>) {
    const { data, error } = await supabaseAdmin
      .from('audio_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as AudioNote;
  }

  static async getNotes() {
    const { data, error } = await supabaseAdmin
      .from('audio_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AudioNote[];
  }

  static async getNoteById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('audio_notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as AudioNote;
  }

  static async deleteNote(id: string) {
    const { error } = await supabaseAdmin
      .from('audio_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
