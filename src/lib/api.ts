import { AudioNote } from '../types';

async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      if (isJson) {
        const errorData = await response.json();
        // Support both old and new error formats
        errorMessage = errorData.error?.message || errorData.error || errorData.message || errorMessage;
      } else {
        const text = await response.text();
        // If it's HTML, it's likely a proxy or fallback error
        if (text.includes('<!doctype html>') || text.includes('<html>')) {
          errorMessage = `Server Error (${response.status}): The server returned an HTML page instead of JSON. This often means the API route is not matching or the server is starting up.`;
        } else {
          errorMessage = text.slice(0, 100) || errorMessage;
        }
      }
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (!isJson) {
    const text = await response.text();
    
    console.error('Non-JSON response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
      body: text.slice(0, 500)
    });
    
    if (text.includes('<!doctype html>') || text.includes('<html>')) {
      throw new Error(`Server returned an HTML page instead of JSON (${response.status}). This usually means the server is still starting or a route is missing.`);
    }
    
    throw new Error(`Server returned a non-JSON response (${response.status} ${response.statusText}).`);
  }

  const json = await response.json();
  // Return data property if it exists, otherwise the whole object
  return json.data !== undefined ? json.data : json;
}

export async function fetchNotes(): Promise<AudioNote[]> {
  const response = await fetch('/api/notes');
  return handleResponse(response);
}

export async function fetchNoteById(id: string): Promise<AudioNote> {
  const response = await fetch(`/api/notes/${id}`);
  return handleResponse(response);
}

export async function uploadAudioFile(
  file: File,
  duration: number,
  title?: string
): Promise<AudioNote> {
  const formData = new FormData();
  formData.append('audio', file);
  formData.append('duration', duration.toString());
  if (title) formData.append('title', title);

  const response = await fetch('/api/notes/upload', {
    method: 'POST',
    body: formData,
  });
  
  return handleResponse(response);
}

export async function fetchAudioUrl(id: string): Promise<string> {
  const response = await fetch(`/api/notes/${id}/audio-url`);
  const data = await handleResponse(response);
  return data.url;
}

export async function retryNoteProcessing(id: string): Promise<AudioNote> {
  const response = await fetch(`/api/notes/${id}/retry`, {
    method: 'POST',
  });
  
  return handleResponse(response);
}

export async function deleteNote(id: string): Promise<void> {
  const response = await fetch(`/api/notes/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) await handleResponse(response);
}
