export class ApiError extends Error {
  constructor({ status, code, message, details = null }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.message = message;
    this.details = details;
  }

  static fromAxiosError(error) {
    if (error.response) {
      const { status, data } = error.response;
      let msg = 'An API error occurred';
      if (typeof data?.detail === 'string') {
        msg = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
        msg = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
      } else if (typeof data?.message === 'string') {
        msg = data.message;
      } else if (typeof data === 'string') {
        msg = data;
      }

      return new ApiError({
        status: status || 500,
        code: data?.code || `HTTP_${status}`,
        message: msg,
        details: data?.details || null,
      });
    }
    if (error.request) {
      return new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.',
        details: error.message,
      });
    }
    return new ApiError({
      status: 500,
      code: 'CLIENT_ERROR',
      message: error.message || 'An unexpected client error occurred.',
    });
  }
}
