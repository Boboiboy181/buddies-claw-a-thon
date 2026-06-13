import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Only treat as an expired session if we actually had a token — a 401 from
      // the login request itself is a wrong-credentials error, handled at the call site.
      const hadToken = Boolean(useAuthStore.getState().token);
      useAuthStore.getState().logout();
      if (hadToken) toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
    return Promise.reject(err);
  }
);
