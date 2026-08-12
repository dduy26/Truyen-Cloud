// Frontend API Service Layer for MangaCloud Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/**
 * Generic fetch wrapper with automatic JWT header injection and 401 handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // 401 Unauthorized handling (Expired/Invalid Token)
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      if (endpoint === '/auth/login') {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Sai tên tài khoản hoặc mật khẩu!');
      }
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Lỗi yêu cầu: ${response.statusText}`);
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Authentication APIs
  login: async (usernameOrEmail, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    if (data) {
      const token = data.token || data.accessToken || data.jwt || 'session_token_' + Date.now();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(data));
    }
    return data;
  },

  register: async (userData) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (data) {
      const token = data.token || data.accessToken || data.jwt || 'session_token_' + Date.now();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(data));
    }
    return data;
  },

  getCurrentUser: () => request('/auth/me'),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  },

  // Story Management APIs
  getStories: () => request('/stories'),

  getStoryBySlug: (slug) => request(`/stories/${slug}`),

  createStory: (storyData) => request('/stories', {
    method: 'POST',
    body: JSON.stringify(storyData),
  }),

  updateStory: (id, storyData) => request(`/stories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(storyData),
  }),

  deleteStory: (id) => request(`/stories/${id}`, {
    method: 'DELETE',
  }),

  // Otruyen Auto Importer API
  // Auto-Crawler 1-Click Search & Import APIs
  searchOtruyenStories: (query) => request(`/admin/import-otruyen/search?q=${encodeURIComponent(query)}`).catch(() => []),
  importOtruyenBySlug: (slug) => request(`/admin/import-otruyen/${slug}`, { method: 'POST' }),
  searchMangadexStories: (query) => request(`/admin/import-otruyen/mangadex/search?q=${encodeURIComponent(query)}`).catch(() => []),
  importMangadexById: (id) => request(`/admin/import-otruyen/mangadex/${id}`, { method: 'POST' }),

  importBatchOtruyenStories: (startPage = 1, endPage = 5) => request(`/admin/import-otruyen/batch?startPage=${startPage}&endPage=${endPage}`, {
    method: 'POST',
  }),

  // Chapter Management APIs
  getChaptersByStory: (storySlug) => request(`/chapters/story/${storySlug}`).catch(() => []),

  getChapterDetail: (storySlug, chapterName) => request(`/chapters/story/${storySlug}/${chapterName}`).catch(() => null),

  createChapter: (storySlugOrData, data) => {
    const payload = typeof storySlugOrData === 'string'
      ? {
        storySlug: storySlugOrData,
        chapterName: String(data?.chapterName || data?.chapterNumber || '1'),
        chapterTitle: data?.chapterTitle || data?.title || `Chapter ${data?.chapterName || 1}`,
        chapterApiUrl: data?.chapterApiUrl || data?.apiDataUrl || '',
        pages: Array.isArray(data?.pages) ? data.pages : []
      }
      : {
        storySlug: storySlugOrData?.storySlug,
        chapterName: String(storySlugOrData?.chapterName || storySlugOrData?.chapterNumber || '1'),
        chapterTitle: storySlugOrData?.chapterTitle || storySlugOrData?.title || `Chapter ${storySlugOrData?.chapterName || 1}`,
        chapterApiUrl: storySlugOrData?.chapterApiUrl || storySlugOrData?.apiDataUrl || '',
        pages: Array.isArray(storySlugOrData?.pages) ? storySlugOrData.pages : []
      };

    return request('/chapters', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteChapter: (id) => request(`/chapters/${id}`, {
    method: 'DELETE',
  }),

  // User Management APIs
  getUsers: () => request('/users').catch(() => []),

  updateUserRole: (userId, role) => request(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }).catch(() => null),

  toggleBanUser: (userId, status) => request(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).catch(() => null),

  // Comment & Report Moderation APIs
  getComments: async () => {
    const res = await request('/comments').catch(() => []);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.content)) return res.content;
    return [];
  },

  getCommentsByStory: async (storySlug) => {
    const res = await request(`/comments/story/${storySlug}`).catch(() => []);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.content)) return res.content;
    return [];
  },

  getCommentsByChapter: async (storySlug, chapterName) => {
    const res = await request(`/comments/story/${storySlug}/${chapterName}`).catch(() => []);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.content)) return res.content;
    return [];
  },

  createComment: (commentData) => request('/comments', {
    method: 'POST',
    body: JSON.stringify(commentData),
  }),

  deleteComment: (id) => request(`/comments/${id}`, {
    method: 'DELETE',
  }).catch(() => null),

  updateComment: (id, content) => request(`/comments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  }),

  // Comment Report APIs
  reportComment: (data) => request('/comment-reports', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getCommentReports: async () => {
    const res = await request('/comment-reports').catch(() => []);
    if (Array.isArray(res)) return res;
    return [];
  },

  resolveCommentReport: (id) => request(`/comment-reports/${id}/resolve`, {
    method: 'PATCH',
  }).catch(() => null),

  dismissCommentReport: (id) => request(`/comment-reports/${id}/dismiss`, {
    method: 'PATCH',
  }).catch(() => null),

  deleteCommentReport: (id) => request(`/comment-reports/${id}`, {
    method: 'DELETE',
  }).catch(() => null),

  getChapterReports: () => request('/reports').catch(() => []),

  resolveReport: (id) => request(`/reports/${id}/resolve`, {
    method: 'POST',
  }).catch(() => null),
};

export default api;
