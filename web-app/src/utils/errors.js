/**
 * Standardize API error messages for user-facing toasts and feedback
 */
export function getErrorMessage(error, defaultMessage = 'An unexpected error occurred.') {
  if (!error) return defaultMessage;

  if (typeof error === 'string') return error;

  // Axios response error
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((err) => err.msg || err.message).join(', ');
    }
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
  }

  if (error.message) return error.message;

  return defaultMessage;
}
