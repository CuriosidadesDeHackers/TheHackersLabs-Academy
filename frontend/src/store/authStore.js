import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set, get) => ({
  user: null,
  membership: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password });
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    await get().fetchProfile();
  },

  register: async (formData) => {
    const { data } = await api.post('/auth/register/', formData);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    const refresh = localStorage.getItem('refresh_token');
    try { await api.post('/auth/logout/', { refresh }); } catch {}
    localStorage.clear();
    set({ user: null, membership: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/profile/');
      set({ user: data, isAuthenticated: true });
      // Fetch membership status
      try {
        const { data: mem } = await api.get('/memberships/my/');
        set({ membership: mem });
      } catch {
        set({ membership: null });
      } finally {
        set({ isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshMembership: async () => {
    try {
      const { data } = await api.get('/memberships/my/');
      set({ membership: data });
    } catch {
      set({ membership: null });
    }
  },

  updateProfile: async (formData) => {
    const { data } = await api.patch('/auth/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    set({ user: data });
  },

  startHeartbeat: () => {
    const beat = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try { await api.post('/auth/heartbeat/'); } catch {}
      }
    };
    beat();
    const id = setInterval(beat, 60000); // every 60 seconds
    return () => clearInterval(id);
  },

  init: async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      await get().fetchProfile();
      get().startHeartbeat();
    } else {
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;
