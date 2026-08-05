const ACCESS_TOKEN_KEY = 'access_token';

class TokenStorage {
  static getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  static setAccessToken(token) {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  }

  static removeAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  static clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export const tokenStorage = TokenStorage;
