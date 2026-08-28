/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProcessingStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export type ProcessingStep = 'upload' | 'transcription' | 'summarization' | 'completed';

export interface Summary {
  executive_summary: string;
  key_highlights: string[];
  action_items: string[];
}

export interface AudioNote {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  duration_seconds: number | null;
  status: ProcessingStatus;
  processing_step: ProcessingStep;
  transcript: string | null;
  summary: Summary | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
