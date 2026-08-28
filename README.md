# Audio Notes Platform

A full-stack AI-powered audio intelligence platform that allows users to upload 2+ minute audio recordings and automatically obtain:
- Speech-to-text transcription using Gnani.ai STT V3
- AI-generated executive summary
- Key highlights
- Action items
- Persistent recording history
- Audio playback
- Processing status and failure handling

---

## Features

- **Audio Format Support**: Accepts `.mp3`, `.wav`, and `.m4a` audio files.
- **50 MB Upload Limit**: Handles large recording uploads up to 50 MB with streaming memory buffering.
- **Duration Validation (≥ 120s)**: Enforces a minimum 2-minute (120-second) duration requirement validated both on the client (HTML5 Audio metadata) and on the server (WAV header byte rate parsing and duration payloads).
- **Server-Side Validation**: Rigorous MIME-type checking, file size verification, and duration checks to reject invalid or corrupt payloads before processing.
- **Private Supabase Storage**: Uploads are stored securely in a private `audio-notes` bucket with zero public access.
- **Gnani.ai STT V3 Integration**: Automated speech-to-text transcription powered by Gnani.ai Vachana ASR (`https://api.vachana.ai/stt/v3`).
- **Long-Audio Handling**: Splits audio into sequential chunks (≤ 25 seconds) with automated WAV header reconstruction to handle recordings exceeding the STT API per-request duration limits.
- **Gemini 3.6 Flash Structured Summarization**: Generates an executive summary (3–5 sentences), key highlights (3–7 bullet points), and actionable next steps formatted via strict JSON schema validation.
- **Durable Database Persistence**: PostgreSQL / Supabase database storing transcripts, structured JSONB summaries, audio metadata, duration, and step-level statuses.
- **Real-Time Processing States**: Tracks four distinct lifecycle stages (`uploading` → `transcription` → `summarization` → `completed`) with client-side polling.
- **Visible Failure States**: Clear, contextual error reporting with user-visible failure alerts when an external API or validation fails.
- **Stage-Aware Retry**: Intelligent retry mechanism (`POST /api/notes/:id/retry`) that detects existing transcripts and resumes processing from summarization without re-running STT.
- **Past Recordings Dashboard**: Comprehensive historical view displaying titles, timestamps, durations, file sizes, and status badges.
- **Reopenable Note Detail Views**: Dedicated routes (`/notes/:id`) allowing users to revisit transcripts, summaries, and action items at any time.
- **Secure Audio Streaming via Signed URLs**: Generates temporary, time-limited (3600-second) signed URLs on demand so audio remains private.
- **Architecture Inspection Page**: Dedicated `/architecture` route presenting subsystem health, data flows, security boundaries, and technical specifications.

---

## Architecture

The platform is designed with a strict separation between client interaction, backend orchestration, and external AI services:

```
User
  │
  ▼
React Frontend (Vite + Tailwind CSS)
  │ (Multipart audio upload / duration metadata)
  ▼
Express Backend (Node.js + TypeScript)
  │
  ├───────────────────────────────────────────┐
  ▼                                           ▼
Supabase Private Storage (audio-notes)     PostgreSQL Database (audio_notes)
  │ (Stores raw audio file)                   │ (Stores metadata & initial status)
  ▼                                           │
Gnani.ai STT V3 (Chunked ASR)                 │
  │ (≤25s sequential chunks & transcript assembly)
  ▼                                           │
Gemini 3.6 Flash (Structured LLM)             │
  │ (Executive summary, highlights, action items)
  ▼                                           ▼
Supabase PostgreSQL ──────────────────────────┘
  │ (Persists final transcript, JSONB summary, status: completed)
  ▼
React Note Detail Page (/notes/:id)
  (Audio playback via Signed URL, transcript, summary & highlights)
```

### Subsystem Responsibilities

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend Client** | React 19, Vite, Tailwind CSS, Lucide | UI dashboard, audio upload zone, audio player, transcript reader, structured summary visualizer, and client-side duration validation. |
| **Backend Server** | Express 4, Node.js, TypeScript | API routing, multipart upload ingestion (Multer), audio chunking, orchestrating external AI calls, generating signed URLs, and error handling. |
| **Private Object Store** | Supabase Storage (`audio-notes`) | Secure, private storage for uploaded audio recordings. Inaccessible via anonymous public URLs. |
| **Speech Recognition** | Gnani.ai STT V3 API | Automatic speech recognition converting sequential audio chunks into concatenated text transcripts. |
| **Intelligence Engine** | Google Gemini 3.6 Flash | Structured analysis returning executive summaries, strategic highlights, and action items adhering to a strict JSON schema. |
| **Database** | PostgreSQL / Supabase | Durable persistence for audio metadata, transcription text, JSONB summaries, processing steps, and error logs with Row Level Security. |

---

## Long Audio Handling

Gnani.ai's synchronous STT endpoint enforces a maximum duration limit per request (~30 seconds). To support recordings of 2 minutes and longer:

1. **Audio Inspection**: The backend inspects the uploaded audio file format and byte stream.
2. **Buffer Splitting & WAV Header Reconstruction**:
   - For **WAV** files: The backend parses the original RIFF/WAVE header (sample rate, channel count, byte rate, bits per sample) and slices the raw PCM data into chunks of ≤ 25 seconds. For each slice, a valid 44-byte WAV header is dynamically generated and prepended.
   - For **MP3 / M4A** files: The backend chunks the stream into bite-sized byte segments (~400 KB) that fit comfortably within duration thresholds.
3. **Sequential Chunk Transcription**: Each chunk is transmitted sequentially to the Gnani STT V3 endpoint (`https://api.vachana.ai/stt/v3`) using `multipart/form-data`.
4. **Transcript Assembly**: The individual chunk transcripts are stitched together into a cohesive, complete transcript before proceeding to the summarization stage.
5. **Execution Model**: In the current implementation, chunk processing runs asynchronously in-memory on the backend server with concurrency guards to avoid duplicate processing jobs.

---

## Processing Flow

```
[1. User Selects Audio]
         │
         ▼
[2. Frontend Validation] ──(Fails)──► [Display Client Error Toast]
         │ (Format, Size, Duration ≥ 120s)
         ▼
[3. POST /api/notes/upload]
         │
         ▼
[4. Backend Server Validation] ──(Fails)──► [HTTP 400/413 Error Response]
         │
         ▼
[5. Upload to Supabase Private Bucket]
         │
         ▼
[6. Insert Database Record (status: 'processing', step: 'transcription')]
         │
         ▼
[7. Trigger Background Pipeline] ──► [Respond HTTP 201 with Note ID]
         │
         ├───► Step 1: Gnani.ai STT V3 (Audio Chunking & Transcription)
         │        │
         │        ├─► [Failure] ──► Update DB (status: 'failed', step: 'transcription')
         │        ▼
         │     [Persist Transcript in DB & set step: 'summarization']
         │
         ├───► Step 2: Gemini 3.6 Flash (Structured JSON Summarization)
         │        │
         │        ├─► [Failure] ──► Update DB (status: 'failed', step: 'summarization')
         │        ▼
         │     [Persist Summary in DB & set status: 'completed']
         │
         ▼
[8. Client Polls /api/notes/:id/status & Renders Note Detail View]
```

### Failure Recovery & Retry Mechanism
- **Stage-Aware Resumption**: When a user clicks **Retry**, the backend inspects the note's existing database record:
  - If transcription was already finished and persisted, the STT step is skipped entirely, and the pipeline resumes directly from the **summarization** step.
  - If transcription failed, the pipeline restarts from the **transcription** step.
- **Concurrency Locking**: An in-memory lock (`processingNotes`) prevents race conditions or overlapping retry operations on the same recording.

---

## Failure Handling

| Failure Scenario | Detection & Handling Mechanism | User Impact / System State |
| :--- | :--- | :--- |
| **Unsupported File Format** | Client validation + Server MIME/extension checks (`.mp3`, `.wav`, `.m4a`). | HTTP 400 `INVALID_FILE_TYPE`. Clear error banner displayed. |
| **File Exceeds 50 MB** | Multer memory limits + HTTP header inspection. | HTTP 413 `FILE_TOO_LARGE`. Upload rejected immediately. |
| **Duration < 120 Seconds** | Client HTML5 Audio duration checks + server WAV byte-rate analysis. | HTTP 400 `INVALID_DURATION`. Form prompts user to upload audio ≥ 2 minutes. |
| **Corrupt / Empty Audio** | Buffer length checks (`size === 0`) and header integrity validation. | HTTP 400 `EMPTY_FILE`. Processing aborted before storage. |
| **Storage Upload Failure** | Try/catch block during Supabase storage ingestion. | HTTP 500 `STORAGE_ERROR`. Record is not created in database. |
| **Database Insertion Failure** | Storage cleanup hook triggered if DB insert fails after file upload. | Prevents orphaned files in Supabase storage bucket. |
| **STT / Network API Errors** | Exponential retry wrapper (`withRetry`) + error classification. | DB updated to `status: 'failed'`, `step: 'transcription'`. Retry button enabled. |
| **LLM Generation Errors** | Markdown code-fence stripping + JSON schema fallback handling. | DB updated to `status: 'failed'`, `step: 'summarization'`. Transcript preserved. |
| **Concurrent Processing** | Server-side in-memory active notes tracking set (`processingNotes`). | HTTP 409 `CONFLICT` if a duplicate retry is triggered while active. |

---

## Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, Motion (Framer Motion), React Router DOM 7, Axios |
| **Backend** | Express 4, Node.js 18+, TypeScript, tsx, esbuild, Multer 2, dotenv, form-data, cors |
| **AI & Speech Services** | Gnani.ai STT V3 (`api.vachana.ai`), Google Gemini 3.6 Flash (`@google/genai` SDK) |
| **Database & Storage** | Supabase (PostgreSQL with Row Level Security, Supabase Storage API) |
| **Tooling & Build** | npm, TypeScript Compiler (`tsc`), Vite Build Engine |

---

## API / Backend

The Express backend exposes RESTful endpoints with structured JSON responses and centralized error handling:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check reporting configuration status for Supabase, Gnani.ai, and Gemini. |
| `GET` | `/api/notes` | Retrieves all audio notes ordered chronologically (`created_at DESC`). |
| `GET` | `/api/notes/:id` | Retrieves full details for a single note (transcript, summary, metadata). |
| `GET` | `/api/notes/:id/status` | Lightweight endpoint for client status polling during transcription and summarization. |
| `POST` | `/api/notes/upload` | Multipart upload endpoint (`audio` field, optional `title`, `duration`). Validates, saves to private storage, creates DB record, and triggers background processing. |
| `POST` | `/api/notes/:id/retry` | Triggers stage-aware retry for failed recordings. |
| `GET` | `/api/notes/:id/audio-url` | Generates a 1-hour time-limited signed URL for streaming audio from private storage. |
| `DELETE` | `/api/notes/:id` | Permanently deletes the audio file from Supabase Storage and removes the record from PostgreSQL. |

---

## Environment Variables

All third-party API credentials, database service keys, and storage secrets must remain server-side. **Never commit the `.env` file or real credentials to GitHub.**

A template file [`.env.example`](.env.example) is provided in the repository root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Gnani.ai STT API
GNANI_API_KEY=your_gnani_api_key_here

# LLM Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

---

## Running Locally

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (comes with Node.js)
- A **Supabase** project (with PostgreSQL database and storage bucket)
- A **Gnani.ai** API Key
- A **Google Gemini** API Key

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone [GitHub Repository — add final repository URL after creating the repository]
   cd audio-notes-platform-final
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your actual credentials (`VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GNANI_API_KEY`, `GEMINI_API_KEY`).

4. **Initialize Database and Storage**:
   - Open your Supabase Project dashboard → **SQL Editor**.
   - Copy and execute the contents of [`supabase/schema.sql`](supabase/schema.sql).
   - This creates the `audio_notes` table with Row Level Security (RLS) and provisions the private `audio-notes` storage bucket.

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The application will start at `http://localhost:3000` (serving both the Express API and Vite frontend via middleware mode).

6. **Type Checking**:
   ```bash
   npm run lint
   ```

7. **Production Build & Execution**:
   ```bash
   npm run build
   npm start
   ```

---

## Project Structure

```
.
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── index.html                # Vite HTML entry point
├── package.json              # Project dependencies and npm scripts
├── server.ts                 # Unified Express server & Vite integration entry
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration with Tailwind CSS plugin
│
├── server/                   # Backend Server Architecture
│   ├── lib/
│   │   ├── config.ts         # Environment validation and configuration loader
│   │   └── supabase.ts       # Supabase Admin client (Service Role initialization)
│   ├── routes/
│   │   └── notes.ts          # API endpoints for notes, upload, status, retry, audio
│   ├── services/
│   │   ├── DatabaseService.ts # PostgreSQL queries and CRUD operations
│   │   ├── GnaniService.ts   # Gnani STT V3 client & audio chunking engine
│   │   ├── LLMService.ts     # Gemini 3.6 Flash structured JSON summarizer
│   │   └── StorageService.ts # Supabase Private Storage upload & signed URL generation
│   └── utils/
│       └── retry.ts          # Asynchronous retry helper with linear backoff
│
├── src/                      # Frontend Single Page Application (React 19)
│   ├── App.tsx               # React Router configuration
│   ├── index.css             # Tailwind CSS tokens & styling
│   ├── main.tsx              # React DOM root mounting
│   ├── vite-env.d.ts         # Vite client type definitions
│   ├── components/
│   │   ├── Layout.tsx        # App header, navigation, and footer
│   │   ├── NoteCard.tsx      # Dashboard recording card with status badges
│   │   ├── StatusBadge.tsx   # Processing stage and status indicators
│   │   └── UploadZone.tsx    # Drag-and-drop audio uploader with duration validation
│   ├── lib/
│   │   └── api.ts            # Frontend Axios API client
│   ├── pages/
│   │   ├── Architecture.tsx  # Systems architecture & flow visualization page
│   │   ├── Dashboard.tsx     # Recordings dashboard & upload interface
│   │   └── NoteDetail.tsx    # Note detail view (player, transcript, summary tabs)
│   └── types/
│       └── index.ts          # TypeScript interfaces for Note, Summary, and Statuses
│
├── supabase/
│   └── schema.sql            # PostgreSQL table definition, triggers, and storage setup
│
└── public/                   # Static assets
```

---

## Architecture Page

The application includes an in-app system architecture page located at `/architecture`:
- **Subsystem Status Dashboard**: Live operational health indicators for Speech-to-Text, Intelligence Core, Database Persistence, and File Storage.
- **Data Flow Breakdown**: Visual end-to-end trace from audio intake through storage, chunked transcription, structured reasoning, and database persistence.
- **Server-Side Security Isolation**: Explicit mapping of client boundaries and service-role execution paths.

Repository Link:
- [GitHub Repository — add final repository URL after creating the repository]

---

## Security

- **Server-Side API Credentials**: All external API keys (`GNANI_API_KEY`, `GEMINI_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`) are kept exclusively on the Express backend and are never sent to or accessible by client browsers.
- **Private Storage Bucket**: Audio recordings are saved in a private Supabase bucket (`audio-notes`) with public access disabled.
- **Time-Limited Signed URLs**: The client never receives persistent direct links to audio files. Audio streaming is facilitated via short-lived (3600-second expiration) signed URLs generated on-demand by the backend.
- **Zero-Trust Database Security (RLS)**: Row Level Security (RLS) is enabled on the `audio_notes` table with no public anonymous policies. Only the backend utilizing the Supabase Service Role Key can query or mutate records.

---

## Future Improvements

The following architectural enhancements are planned for future iterations:
- **Durable Background Job Queue**: Integrate BullMQ / Redis or AWS SQS to handle audio processing tasks with decoupled worker processes, job persistence across server restarts, and concurrency throttling.
- **Real-Time Push Updates (SSE / WebSockets)**: Replace client-side status polling with Server-Sent Events (SSE) or WebSockets for instant state change notifications.
- **User Authentication & Multi-Tenancy**: Integrate Supabase Auth to enable user accounts, workspace isolation, and user-specific Row Level Security policies.
- **Exponential Backoff & Circuit Breakers**: Implement resilient circuit-breaker patterns for external third-party API dependencies.
- **Audio Preprocessing**: Incorporate server-side FFmpeg processing for noise filtering, format standardization, and audio compression prior to STT dispatch.
- **Observability & Distributed Tracing**: Implement structured JSON telemetry, OpenTelemetry instrumentation, and Prometheus metrics for audio processing latency.

---

## Deployment

The application is built to run as a unified full-stack Node.js application:
- `npm run build` compiles the React frontend with Vite into `dist/` and bundles the backend with `esbuild` into `dist/server.cjs`.
- In production mode (`NODE_ENV=production`), Express serves the compiled frontend static files and handles all `/api/*` endpoints on the designated `PORT`.
- Deployment requires provisioning a Supabase project (executing `supabase/schema.sql`), creating the `audio-notes` private bucket, and setting environment variables on the production host (e.g., Render, Railway, AWS ECS, or Fly.io).

---

## Assignment Requirements

| Requirement | Implementation Status | Notes |
| :--- | :---: | :--- |
| Audio upload | `[x]` | Drag-and-drop & file browser for MP3, WAV, and M4A up to 50 MB. |
| 2+ minute recording support | `[x]` | Minimum 120-second duration validation on client and server. |
| Gnani.ai ASR Integration | `[x]` | Automated speech-to-text via Gnani.ai STT V3 API. |
| LLM-Generated Summary | `[x]` | Structured executive summary, highlights, and action items via Gemini 3.6 Flash. |
| Past Uploads Listed | `[x]` | Dashboard view displaying all recordings with timestamps, duration, and status. |
| Recordings Reopenable | `[x]` | Reopenable detail view (`/notes/:id`) with persistent data and tabbed layout. |
| Processing Progress / Status | `[x]` | Real-time tracking across `uploading`, `transcription`, `summarization`, and `completed`. |
| Visible Failure Handling | `[x]` | Contextual error notifications and step-specific failure states. |
| Retry Handling | `[x]` | Stage-aware retry mechanism (`POST /api/notes/:id/retry`). |
| Long-Audio Handling | `[x]` | Sequential chunking (≤25s) with automated WAV header reconstruction. |
| Private File Storage | `[x]` | Private Supabase bucket with on-demand 3600s signed URLs. |
| `/architecture` Page | `[x]` | In-app architecture and data flow visualizer. |
| Production Deployment | `[ ]` | Ready for deployment with `npm run build` & `npm start`. |
| Final GitHub Repository URL | `[ ]` | To be updated upon repository publication. |
| Final Submission Form | `[ ]` | Pending final candidate submission. |
