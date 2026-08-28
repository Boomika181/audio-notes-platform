/**
 * Audio Notes Platform - Secured Database Schema
 * 
 * SECURITY MODEL:
 * 1. Zero Trust: RLS is enabled on all tables.
 * 2. No Public Policies: Browser 'anon' key has 0 permissions (no select/insert/update/delete).
 * 3. Service-Role Authorization: Only the Express backend (using SUPABASE_SERVICE_ROLE_KEY) 
 *    can interact with the database and storage.
 */

-- 1. Create the audio_notes table
CREATE TABLE IF NOT EXISTS audio_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  duration_seconds NUMERIC,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploading', 'processing', 'completed', 'failed')),
  processing_step TEXT NOT NULL CHECK (processing_step IN ('upload', 'transcription', 'summarization', 'completed')),
  transcript TEXT,
  summary JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
-- With RLS enabled and NO policies created, ALL requests from the browser (anon key) will be REJECTED.
-- The Service Role key used by the backend bypasses RLS automatically.
ALTER TABLE audio_notes ENABLE ROW LEVEL SECURITY;

-- 3. Update Timestamp Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_audio_notes_updated_at') THEN
        CREATE TRIGGER update_audio_notes_updated_at
            BEFORE UPDATE ON audio_notes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 4. Create Private Storage Bucket
-- This ensures the 'audio-notes' bucket exists and is set to private.
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-notes', 'audio-notes', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Security (Zero Trust)
-- We do not create any storage.objects policies. 
-- This means the 'anon' key cannot read or write to the bucket.
-- The Service Role key used by the backend bypasses storage RLS.
