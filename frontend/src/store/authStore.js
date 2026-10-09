import { create } from 'zustand';
import authService from '../services/auth.service.js';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await authService.getMe();
      set({ user: res.user, isAuthenticated: true, isLoading: false });
      return res.user;
    } catch (err) {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      return null;
    }
  },

  login: async (credentials) => {
    try {
      set({ isLoading: true, error: null });
      const res = await authService.login(credentials);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
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
      set({ user: res.user, isAuthenticated: true, isLoading: false });
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
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
