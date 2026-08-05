export class RequestQueue {
  constructor() {
    this.pendingRequests = new Map();
  }

  static getKey(config) {
    return `${config.method?.toUpperCase()}_${config.url}_${JSON.stringify(config.params || {})}`;
  }

  add(config) {
    const key = RequestQueue.getKey(config);
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    return null;
  }

  register(config, promise) {
    const key = RequestQueue.getKey(config);
    this.pendingRequests.set(key, promise);
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  clear() {
    this.pendingRequests.clear();
  }
}

export const requestQueue = new RequestQueue();
