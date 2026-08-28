/**
 * Simple retry helper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, onRetry } = options;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors (e.g., 400 Bad Request, 401 Unauthorized)
      const status = error.response?.status;
      if (status && status < 500 && status !== 429) {
        throw error;
      }

      if (attempt === maxRetries) break;

      const delay = initialDelay * Math.pow(2, attempt - 1);
      if (onRetry) onRetry(error, attempt);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
