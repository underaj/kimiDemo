// Authentication utility functions
export const AUTH_CONFIG = {
  username: 'admin',
  password: 'admin_T0by'
};

export const AuthUtils = {
  // Check if user is logged in
  isLoggedIn: (): boolean => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('isLoggedIn') === 'true';
  },

  // Login
  login: (username: string, password: string): boolean => {
    if (username === AUTH_CONFIG.username && password === AUTH_CONFIG.password) {
      sessionStorage.setItem('isLoggedIn', 'true');
      return true;
    }
    return false;
  },

  // Logout
  logout: (): void => {
    sessionStorage.removeItem('isLoggedIn');
  }
}; 