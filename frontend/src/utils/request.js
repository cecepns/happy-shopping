import { api } from './api';

export const get = async (url, params) => {
  const { data } = await api.get(url, { params });
  return data;
};

export const post = async (url, body, config) => {
  const { data } = await api.post(url, body, config);
  return data;
};

export const put = async (url, body, config) => {
  const { data } = await api.put(url, body, config);
  return data;
};

export const patch = async (url, body) => {
  const { data } = await api.patch(url, body);
  return data;
};

export const del = async (url) => {
  const { data } = await api.delete(url);
  return data;
};

export const uploadFile = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.data.url;
};
