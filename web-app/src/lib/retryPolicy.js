export async function withRetry(fn, options = {}) {
  const retries = options.retries ?? 3;
  const delay = options.delay ?? 1000;
  const backoff = options.backoff ?? 2;

  let lastError;
  let currentDelay = delay;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Do not retry client 4xx errors except 429 Too Many Requests
      if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err;
      }
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= backoff;
      }
    }
  }

  throw lastError;
}
