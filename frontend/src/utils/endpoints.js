const BASE = 'https://api.kingcreativestudio.my.id/happy-shopping';

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || `${BASE}/api`,
  ASSET_URL: import.meta.env.VITE_ASSET_URL || BASE
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile'
  },
  UPLOAD: {
    SINGLE: '/upload',
    MULTIPLE: '/upload/multiple'
  },
  BANNERS: {
    LIST: '/banners',
    DETAIL: (id) => `/banners/${id}`
  },
  CATEGORIES: {
    LIST: '/categories'
  },
  PRODUCTS: {
    LIST: '/products',
    DETAIL: (id) => `/products/${id}`
  },
  SELLER: {
    PRODUCTS: '/seller/products',
    PRODUCT: (id) => `/seller/products/${id}`,
    ORDERS: '/seller/orders',
    DASHBOARD: '/seller/dashboard'
  },
  ORDERS: {
    LIST: '/orders',
    DETAIL: (id) => `/orders/${id}`,
    STATUS: (id) => `/orders/${id}/status`,
    CREATE: '/orders'
  },
  SHIPPING: {
    DESTINATION: '/shipping/destination',
    COST: '/shipping/cost'
  },
  BALANCE: {
    INFO: '/balance',
    TOPUP: '/topup',
    TOPUP_LIST: '/topup'
  },
  PAYMENT_METHODS: {
    LIST: '/payment-methods'
  },
  CHAT: {
    CONVERSATIONS: '/chat/conversations',
    MESSAGES: (id) => `/chat/conversations/${id}/messages`
  },
  SETTINGS: {
    LIST: '/settings'
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    USER: (id) => `/admin/users/${id}`,
    ORDERS: '/admin/orders',
    CATEGORIES: '/admin/categories',
    CATEGORY: (id) => `/admin/categories/${id}`,
    BANNERS: '/banners',
    TOPUP: '/admin/topup',
    TOPUP_ACTION: (id) => `/admin/topup/${id}`,
    BALANCE_SEARCH: '/admin/balance/search',
    BALANCE_ADJUST: '/admin/balance/adjust',
    BALANCE_TRANSACTIONS: '/admin/balance/transactions',
    SETTINGS: '/admin/settings',
    PAYMENT_METHODS: '/admin/payment-methods',
    PAYMENT_METHOD: (id) => `/admin/payment-methods/${id}`
  }
};
