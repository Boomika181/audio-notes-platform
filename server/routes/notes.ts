import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { DatabaseService } from '../services/DatabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import { GnaniService } from '../services/GnaniService';
import { LLMService } from '../services/LLMService';
import { StorageService } from '../services/StorageService';
import { ProcessingStep } from '../../src/types';

const router = Router();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  }
});

// In-memory set to prevent concurrent processing of the same note
const processingNotes = new Set<string>();

/**
 * Estimate audio duration from buffer header if possible
 */
function estimateAudioDuration(buffer: Buffer, mimetype: string): number | null {
  try {
    if (buffer.length < 44) return null;

    // Check WAV header
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
      const byteRate = buffer.readUInt32LE(28);
      if (byteRate > 0) {
        return Math.round((buffer.length - 44) / byteRate);
      }
    }
  } catch (e) {
    // Ignore header parsing errors
  }
  return null;
}

/**
 * Robust background processing pipeline
 */
async function processNote(noteId: string) {
  if (processingNotes.has(noteId)) {
    console.log(`[PROCESSOR] Note ${noteId} is already active. Skipping.`);
    return;
  }

  processingNotes.add(noteId);
  console.log(`[PROCESSOR][START] ${noteId}`);
  
  let currentStep: ProcessingStep = 'transcription';
  
  try {
    const note = await DatabaseService.getNoteById(noteId);
    
    // 1. Transcription Phase
    if (!note.transcript) {
      currentStep = 'transcription';
      console.log(`[PROCESSOR][TRANSCRIPTION_START] ${noteId}`);
      
      await DatabaseService.updateNote(noteId, { 
        status: 'processing',
        processing_step: 'transcription',
        error_message: null
      });
      
      let transcript: string;
      try {
        transcript = await GnaniService.transcribe(note.storage_path);
        console.log(`[PROCESSOR][TRANSCRIPTION_COMPLETE] ${noteId}`);
      } catch (err: any) {
        const msg = err.message || '';
        const isAuthError = err.response?.status === 401 || err.response?.status === 403 || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('unauthorized');
        if (isAuthError) {
          throw new Error('Audio transcription service authentication failed. Please check GNANI_API_KEY in server environment.');
        }
        throw err;
      }
      
      // Persist transcript immediately
      await DatabaseService.updateNote(noteId, { 
        transcript,
        processing_step: 'summarization' 
      });
      
      // Update local variable for next step
      note.transcript = transcript;
    }

    // 2. Summarization Phase
    currentStep = 'summarization';
    console.log(`[PROCESSOR][SUMMARIZATION_START] ${noteId}`);
    
    let summary;
    try {
      summary = await LLMService.summarize(note.transcript!);
      console.log(`[PROCESSOR][SUMMARIZATION_COMPLETE] ${noteId}`);
    } catch (err: any) {
      const msg = err.message || '';
      const isAuthError = err.status === 401 || err.status === 403 || msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('unauthorized');
      if (isAuthError) {
        throw new Error('AI summarization service authentication failed. Please check GEMINI_API_KEY in server environment.');
      }
      throw err;
    }

    // 3. Finalization
    await DatabaseService.updateNote(noteId, {
      summary,
      status: 'completed',
      processing_step: 'completed',
      error_message: null
    });
    
    console.log(`[PROCESSOR][SUCCESS] ${noteId}`);
  } catch (error: any) {
    console.error(`[PROCESSOR][FAILED] ${noteId} at ${currentStep}:`, error.message);
    
    await DatabaseService.updateNote(noteId, {
      status: 'failed',
      processing_step: currentStep,
      error_message: error.message || 'An unexpected error occurred during processing.'
    });
  } finally {
    processingNotes.delete(noteId);
  }
}

// Middleware to check if Supabase is configured
const checkConfig = (req: Request, res: Response, next: NextFunction) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ 
      success: false,
      error: 'Supabase is not configured. Please set required environment variables.',
      code: 'SERVICE_UNAVAILABLE',
      message: 'Supabase is not configured. Please set required environment variables.' 
    });
  }
  next();
};

// GET /api/notes
router.get('/', checkConfig, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notes = await DatabaseService.getNotes();
    res.json({ success: true, data: notes });
  } catch (error: any) {
    next(error);
  }
});

// GET /api/notes/:id
router.get('/:id', checkConfig, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await DatabaseService.getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
        code: 'NOT_FOUND',
        message: 'Note not found'
      });
    }
    res.json({ success: true, data: note });
  } catch (error: any) {
    res.status(404).json({ 
      success: false, 
      error: 'Note not found',
      code: 'NOT_FOUND',
      message: 'Note not found'
    });
  }
});

// GET /api/notes/:id/status (Lightweight status check)
router.get('/:id/status', checkConfig, async (req: Request, res: Response) => {
  try {
    const note = await DatabaseService.getNoteById(req.params.id);
    res.json({ 
      success: true, 
      data: {
        id: note.id,
        status: note.status,
        processing_step: note.processing_step,
        error_message: note.error_message
      }
    });
  } catch (error: any) {
    res.status(404).json({ 
      success: false, 
      error: 'Note not found',
      code: 'NOT_FOUND',
      message: 'Note not found'
    });
  }
});

// Audio signed URL handler
const handleAudioSignedUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await DatabaseService.getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
        code: 'NOT_FOUND',
        message: 'Note not found'
      });
    }
    const url = await StorageService.getSignedUrl(note.storage_path);
    res.json({ success: true, data: { url } });
  } catch (error: any) {
    console.error('[API] Signed URL generation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate secure audio URL',
      code: 'STORAGE_ERROR',
      message: 'Failed to generate secure audio URL'
    });
  }
};

// Support both GET /api/notes/:id/audio-url and GET /api/notes/:id/audio
router.get('/:id/audio-url', checkConfig, handleAudioSignedUrl);
router.get('/:id/audio', checkConfig, handleAudioSignedUrl);

// Upload handler
const handleUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file provided',
        code: 'BAD_REQUEST',
        message: 'No audio file provided' 
      });
    }

    const file = req.file;

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(413).json({
        success: false,
        error: 'File size exceeds maximum limit of 50 MB.',
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum limit of 50 MB.'
      });
    }

    if (file.size === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'The uploaded file is empty.',
        code: 'EMPTY_FILE',
        message: 'The uploaded file is empty.' 
      });
    }

    // Validate extension & MIME type
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
    const allowedExts = ['.mp3', '.wav', '.m4a'];

    const ext = path.extname(file.originalname).toLowerCase();
    const hasValidMime = allowedMimeTypes.includes(file.mimetype.toLowerCase());
    const hasValidExt = allowedExts.includes(ext);

    if (!hasValidMime || !hasValidExt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported file type. Please upload MP3, WAV, or M4A.',
        code: 'INVALID_FILE_TYPE',
        message: 'Unsupported file type. Please upload MP3, WAV, or M4A.' 
      });
    }

    // Validate Minimum Duration (>= 120 seconds)
    const clientDuration = parseInt(req.body.duration || '0', 10);
    const estimatedDuration = estimateAudioDuration(file.buffer, file.mimetype);
    const effectiveDuration = clientDuration > 0 ? clientDuration : (estimatedDuration || 0);

    if (effectiveDuration > 0 && effectiveDuration < 120) {
      return res.status(400).json({
        success: false,
        error: `Recording is too short (${effectiveDuration}s). Minimum 2 minutes (120 seconds) required.`,
        code: 'INVALID_DURATION',
        message: `Recording is too short (${effectiveDuration}s). Minimum 2 minutes (120 seconds) required.`
      });
    }

    console.log(`[API][UPLOAD] Received: ${file.originalname} (${file.size} bytes, ${effectiveDuration}s)`);

    // 1. Upload to Private Storage
    const storagePath = await StorageService.uploadAudio(file.buffer, file.originalname, file.mimetype);

    // 2. Create Database Record cleanly (with cleanup on error)
    let note;
    try {
      note = await DatabaseService.createNote({
        title: req.body.title || path.basename(file.originalname, ext),
        file_name: path.basename(file.originalname),
        file_size: file.size,
        mime_type: file.mimetype,
        storage_path: storagePath,
        duration_seconds: effectiveDuration > 0 ? effectiveDuration : null,
        status: 'processing',
        processing_step: 'transcription',
      });
    } catch (dbError) {
      console.error('[API][UPLOAD] Database record creation failed. Cleaning up uploaded file:', dbError);
      await StorageService.deleteAudio(storagePath).catch(err => {
        console.warn('[API][UPLOAD] Storage cleanup failed:', err);
      });
      throw dbError;
    }

    // 3. Trigger Background Processing
    processNote(note.id).catch(err => console.error(`[CRITICAL] Initial processing trigger failed for ${note.id}:`, err));

    res.status(201).json({ success: true, data: note });
  } catch (error: any) {
    next(error);
  }
};

// Multer error handling wrapper
const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single('audio')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'File size exceeds maximum limit of 50 MB.',
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum limit of 50 MB.'
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload error',
        code: 'UPLOAD_ERROR',
        message: err.message || 'File upload error'
      });
    }
    next();
  });
};

// Support both POST /api/notes/upload and POST /api/notes
router.post('/upload', checkConfig, uploadMiddleware, handleUpload);
router.post('/', checkConfig, uploadMiddleware, handleUpload);

// POST /api/notes/:id/retry
router.post('/:id/retry', checkConfig, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await DatabaseService.getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
        code: 'NOT_FOUND',
        message: 'Note not found'
      });
    }

    if (processingNotes.has(note.id)) {
      return res.status(409).json({ 
        success: false, 
        error: 'This note is already being processed.',
        code: 'CONFLICT',
        message: 'This note is already being processed.' 
      });
    }
    
    // Determine where to resume stage-aware retry
    const step: ProcessingStep = note.transcript ? 'summarization' : 'transcription';
    
    console.log(`[API][RETRY] Retrying ${note.id} from ${step}`);

    const updatedNote = await DatabaseService.updateNote(note.id, {
      status: 'processing',
      processing_step: step,
      error_message: null
    });

    processNote(updatedNote.id).catch(err => console.error(`[CRITICAL] Retry trigger failed for ${note.id}:`, err));

    res.json({ success: true, data: updatedNote });
  } catch (error: any) {
    next(error);
  }
});

// DELETE /api/notes/:id
router.delete('/:id', checkConfig, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const note = await DatabaseService.getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
        code: 'NOT_FOUND',
        message: 'Note not found'
      });
    }
    
    // 1. Delete from storage
    try {
      await StorageService.deleteAudio(note.storage_path);
    } catch (err) {
      console.warn(`[API][DELETE] Storage cleanup failed for ${note.id}:`, err);
    }

    // 2. Delete from database
    await DatabaseService.deleteNote(note.id);
    
    res.json({ success: true });
  } catch (error: any) {
    next(error);
  }
});

export default router;

