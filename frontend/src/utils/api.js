import axios from 'axios';
import { API_CONFIG } from './endpoints';

export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err.response?.data || { message: 'Terjadi kesalahan.' })
);

export const assetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_CONFIG.ASSET_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const formatCurrency = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

export const formatDate = (d) =>
  d ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d)) : '-';
