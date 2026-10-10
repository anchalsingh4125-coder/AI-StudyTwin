import { create } from 'zustand';
import authService from '../services/auth.service.js';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('authToken') : null;
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        return null;
      }

      const res = await authService.getMe();
      const user = res.data?.user ?? res.user;
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (err) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('authToken');
      }
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      return null;
    }
  },

  login: async (credentials) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authService.login(credentials);
      const user = res.data?.user ?? res.user;
      const token = res.data?.token ?? res.token;
      if (token && typeof window !== 'undefined') {
        sessionStorage.setItem('authToken', token);
      }
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      set({ isLoading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  register: async (userData) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authService.register(userData);
      const user = res.data?.user ?? res.user;
      const token = res.data?.token ?? res.token;
      if (token && typeof window !== 'undefined') {
        sessionStorage.setItem('authToken', token);
      }
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      set({ isLoading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout error:', err.message);
    } finally {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('authToken');
      }
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
