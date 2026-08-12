import React, { useState, useEffect } from 'react';
import api from './services/api';
import AdminDashboard from './components/AdminDashboard';
import './index.css';

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80';
const DEFAULT_WEBTOON_PAGE = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=95';
const DEFAULT_USER_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="%23cbd5e1"/><circle cx="100" cy="75" r="40" fill="%23ffffff"/><path d="M100 125c-42 0-75 22-75 48v20h150v-20c0-26-33-48-75-48z" fill="%23ffffff"/></svg>`;

// Full categories list matching OTruyen manga genres
const CATEGORIES_LIST = [
  'Action', 'Adult', 'Adventure', 'Anime', 'Chuyển Sinh', 'Comedy', 'Comic',
  'Demons', 'Detective', 'Doujinshi', 'Drama', 'Ecchi', 'Fantasy', 'Gender Swapping',
  'Harem', 'Historical', 'Horror', 'Isekai', 'Josei', 'Loli', 'Manga', 'Manhua',
  'Manhwa', 'Martial Arts', 'Mecha', 'Mystery', 'Ngôn Tình', 'One shot', 'Psychological',
  'Romance', 'School Life', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shoujo Ai', 'Shounen',
  'Shounen Ai', 'Slice of Life', 'Soft Yaoi', 'Soft Yuri', 'Sports', 'Supernatural',
  'Sáng Tác', 'Tragedy', 'Xuyên Không'
];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('mangacloud_theme') || 'light');
  const [routePath, setRoutePath] = useState(window.location.pathname || '/');

  // User state & Bookmarks list (Default: GUEST mode)
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('GUEST'); // 'GUEST' | 'MEMBER' | 'ADMIN'
  const [bookmarkedStories, setBookmarkedStories] = useState(() => {
    try {
      const saved = localStorage.getItem('mangacloud_bookmarks_list');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('mangacloud_bookmarks_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showCategoryPopover, setShowCategoryPopover] = useState(false);
  const [showAuthorsModal, setShowAuthorsModal] = useState(false);

  // Auth Modal State (Login & Register)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Auth Form Fields
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');

  // Data & Toast state
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [displayCount, setDisplayCount] = useState(18);

  // Active Selected Story & Chapter for Detail/Read Routes
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  // Admin View State
  const [adminActiveNav, setAdminActiveNav] = useState('Dashboard');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoutePath(path);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    if (path.startsWith('/story/')) {
      const slug = path.replace('/story/', '');
      const found = stories.find(s => s.slug === slug);
      if (found) setSelectedStory(found);
    } else if (path.startsWith('/read/')) {
      const parts = path.replace('/read/', '').split('/');
      const slug = parts[0];
      const chapter = parts[1] || '1';
      const found = stories.find(s => s.slug === slug);
      if (found) {
        setSelectedStory(found);
        setSelectedChapter(chapter);
      }
    }
  };

  // Ensure 100% scroll to top on every route transition
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [routePath]);

  useEffect(() => {
    const handlePopState = () => {
      setRoutePath(window.location.pathname || '/');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mangacloud_theme', theme);
  }, [theme]);

  // Floating Scroll to Top Button Listener
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sanitizeThumbUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '' || url.startsWith('blob:')) {
      return DEFAULT_COVER_IMAGE;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://otruyenapi.com/uploads/comics/${url.replace(/^\/+/, '')}`;
    }
    return url;
  };

  const getStoryPosterUrl = (storySlug, fallbackUrl) => {
    const slugLower = (storySlug || '').toLowerCase();
    if (slugLower.includes('solo-leveling')) return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';
    if (slugLower.includes('one-piece') || slugLower.includes('vua-hai-tac')) return 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80';
    if (slugLower.includes('dragon-ball') || slugLower.includes('bay-vien-ngoc')) return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80';
    if (slugLower.includes('naruto')) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80';

    const matched = Array.isArray(stories) ? stories.find(s => s.slug === storySlug || s.id === storySlug || (s.slug && storySlug && s.slug.includes(storySlug))) : null;
    if (matched && matched.thumbUrl) {
      return sanitizeThumbUrl(matched.thumbUrl);
    }
    return sanitizeThumbUrl(fallbackUrl);
  };

  // Helper to format chapter badge text accurately (e.g. 'Ch. 1174')
  const getChapterDisplayText = (story) => {
    if (!story) return 'Ch. 1';
    if (story.latestChapter && story.latestChapter !== 'Ch. 1' && story.latestChapter !== '1') {
      return story.latestChapter.startsWith('Ch') ? story.latestChapter : `Ch. ${story.latestChapter}`;
    }
    if (story.totalChapters && story.totalChapters > 1) {
      return `Ch. ${story.totalChapters}`;
    }
    return story.latestChapter || 'Ch. 1';
  };

  // Parse date safely handling ISO strings, Jackson arrays, and Epoch timestamps
  const parseDate = (input) => {
    if (!input) return new Date();
    if (input instanceof Date) return input;
    if (Array.isArray(input)) {
      const [y, m, d, h, min, s] = input;
      return new Date(y, (m || 1) - 1, d || 1, h || 0, min || 0, s || 0);
    }
    if (typeof input === 'number') {
      return new Date(input);
    }
    if (typeof input === 'string') {
      const str = input.trim();
      if (str.endsWith('Z') || str.includes('+')) {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) return parsed;
      }
      const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
      if (match) {
        const [, y, m, d, h, min, s] = match;
        return new Date(
          parseInt(y, 10),
          parseInt(m, 10) - 1,
          parseInt(d, 10),
          parseInt(h || 0, 10),
          parseInt(min || 0, 10),
          parseInt(s || 0, 10)
        );
      }
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  // Format relative time helper with 100% accurate local time comparison
  const formatRelativeTime = (dateInput) => {
    if (!dateInput) return 'Vừa xong';
    try {
      const d = parseDate(dateInput);
      const now = new Date();
      let diffMs = now.getTime() - d.getTime();

      if (diffMs < 0) diffMs = 0;

      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 45) {
        return 'Vừa xong';
      }
      if (diffMin < 60) {
        return `${Math.max(1, diffMin)} phút trước`;
      }
      if (diffHour < 24) {
        return `${diffHour} giờ trước`;
      }
      if (diffDay < 30) {
        return `${diffDay} ngày trước`;
      }

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) { }

    return 'Vừa xong';
  };

  // Smart relative time formatter for Chapter List
  const formatSmartChapterTime = (updatedAt) => {
    if (!updatedAt) return 'Vừa xong';
    try {
      const d = parseDate(updatedAt);
      const now = new Date();
      let diffMs = now.getTime() - d.getTime();

      if (diffMs < 0) diffMs = 0;

      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 45) {
        return 'Vừa xong';
      }
      if (diffMin < 60) {
        return `${Math.max(1, diffMin)} phút trước`;
      }
      if (diffHour < 24) {
        return `${diffHour} giờ trước`;
      }
      if (diffDay < 7) {
        return `${diffDay} ngày trước`;
      }

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) { }

    return 'Vừa xong';
  };

  // Toggle Bookmark Handler with localStorage persistence & full story object caching
  const toggleBookmark = (storyOrId, storyName, e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    let storyObj = null;
    let targetKey = null;

    if (typeof storyOrId === 'object' && storyOrId !== null) {
      storyObj = storyOrId;
      targetKey = storyObj.id || storyObj.slug;
    } else {
      targetKey = storyOrId || selectedStory?.id || selectedStory?.slug;
      storyObj = (selectedStory && (selectedStory.id === targetKey || selectedStory.slug === targetKey))
        ? selectedStory
        : (Array.isArray(stories) ? stories.find(s => String(s.id) === String(targetKey) || String(s.slug) === String(targetKey)) : null)
        || { id: targetKey, slug: targetKey, name: storyName || 'Truyện', thumbUrl: DEFAULT_COVER_IMAGE };
    }

    if (!targetKey) return;
    const keyStr = String(targetKey);
    const nameStr = storyObj.name || storyName || 'Truyện';

    setBookmarkedIds(prev => {
      const nextIds = new Set(prev);
      const isAlready = nextIds.has(keyStr) || (storyObj.slug && nextIds.has(String(storyObj.slug))) || (storyObj.id && nextIds.has(String(storyObj.id)));

      let nextList = [];
      if (isAlready) {
        if (storyObj.id) nextIds.delete(String(storyObj.id));
        if (storyObj.slug) nextIds.delete(String(storyObj.slug));
        nextIds.delete(keyStr);

        nextList = bookmarkedStories.filter(s => String(s.id) !== keyStr && String(s.slug) !== keyStr);
        showToast(`Đã bỏ theo dõi: ${nameStr}`);
      } else {
        if (storyObj.id) nextIds.add(String(storyObj.id));
        if (storyObj.slug) nextIds.add(String(storyObj.slug));
        nextIds.add(keyStr);

        const newEntry = {
          id: storyObj.id || keyStr,
          slug: storyObj.slug || keyStr,
          name: nameStr,
          thumbUrl: storyObj.thumbUrl || DEFAULT_COVER_IMAGE,
          latestChapter: storyObj.latestChapter || 'Ch. 1',
          author: storyObj.author || 'MangaCloud'
        };
        nextList = [newEntry, ...bookmarkedStories.filter(s => String(s.id) !== keyStr && String(s.slug) !== keyStr)];
        showToast(`❤️ Đã lưu "${nameStr}" vào Theo Dõi!`);
      }

      setBookmarkedStories(nextList);
      try {
        localStorage.setItem('mangacloud_bookmarks_ids', JSON.stringify(Array.from(nextIds)));
        localStorage.setItem('mangacloud_bookmarks_list', JSON.stringify(nextList));
      } catch (err) { }

      return nextIds;
    });
  };

  const isStoryBookmarked = (story) => {
    if (!story) return false;
    const idKey = story.id ? String(story.id) : null;
    const slugKey = story.slug ? String(story.slug) : null;
    return Boolean((idKey && bookmarkedIds.has(idKey)) || (slugKey && bookmarkedIds.has(slugKey)));
  };

  // Check persistent token & user session on app launch
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        const roleStr = parsedUser.role || (Array.isArray(parsedUser.roles) ? parsedUser.roles[0] : null) || 'ROLE_MEMBER';
        const isSystemAdmin = roleStr === 'ROLE_ADMIN' || roleStr.includes('ADMIN');
        setUserRole(isSystemAdmin ? 'ADMIN' : 'MEMBER');
        if (!token) {
          localStorage.setItem('token', parsedUser.token || ('session_token_' + Date.now()));
        }
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Auth Submit Handlers with Real Backend API Integration
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    if (authTab === 'login') {
      if (!authEmail || !authPassword) {
        const msg = 'Vui lòng nhập đầy đủ Email/Username và Mật khẩu!';
        setAuthError(msg);
        showToast(msg, 'error');
        setAuthLoading(false);
        return;
      }

      try {
        // Call Backend API POST /api/v1/auth/login
        const res = await api.login(authEmail, authPassword);
        const roleStr = res.role || res.roles?.[0] || (authEmail.includes('admin') ? 'ROLE_ADMIN' : 'ROLE_MEMBER');
        const isSystemAdmin = roleStr === 'ROLE_ADMIN' || roleStr.includes('ADMIN');

        const tokenVal = res.token || res.accessToken || res.jwt || ('session_token_' + Date.now());
        const userData = {
          username: res.username || authEmail.split('@')[0],
          email: res.email || authEmail,
          role: roleStr,
          token: tokenVal
        };

        localStorage.setItem('token', tokenVal);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setUserRole(isSystemAdmin ? 'ADMIN' : 'MEMBER');

        showToast(`🔑 Đăng nhập thành công! Chào mừng ${userData.username}`);
        setShowAuthModal(false);
        setAuthEmail('');
        setAuthPassword('');
        setAuthUsername('');
        setAuthError('');
      } catch (err) {
        const errMsg = err.message || 'Sai tên tài khoản hoặc mật khẩu!';
        setAuthError(errMsg);
        showToast(errMsg, 'error');
      } finally {
        setAuthLoading(false);
      }
    } else {
      // REGISTER
      if (!authUsername || !authEmail || !authPassword) {
        const msg = 'Vui lòng điền đầy đủ Username, Email và Mật khẩu!';
        setAuthError(msg);
        showToast(msg, 'error');
        setAuthLoading(false);
        return;
      }

      try {
        // Call Backend API POST /api/v1/auth/register
        const res = await api.register({
          username: authUsername,
          email: authEmail,
          password: authPassword
        });

        const tokenVal = res.token || res.accessToken || res.jwt || ('session_token_' + Date.now());
        const userData = {
          username: res.username || authUsername,
          email: res.email || authEmail,
          role: res.role || 'ROLE_MEMBER',
          token: tokenVal
        };

        localStorage.setItem('token', tokenVal);
        localStorage.setItem('user', JSON.stringify(userData));

        setUser(userData);
        setUserRole('MEMBER');

        showToast(`🎉 Đăng ký tài khoản "${authUsername}" thành công!`);
        setShowAuthModal(false);
        setAuthUsername('');
        setAuthEmail('');
        setAuthPassword('');
        setAuthError('');
      } catch (err) {
        const errMsg = err.message || 'Đăng ký thất bại. Tên đăng nhập hoặc Email có thể đã tồn tại!';
        setAuthError(errMsg);
        showToast(errMsg, 'error');
      } finally {
        setAuthLoading(false);
      }
    }
  };

  // Reader & Comment State
  const [chapterDetail, setChapterDetail] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [storyChaptersList, setStoryChaptersList] = useState([]);
  const [chapterComments, setChapterComments] = useState([]);
  const [newCommentInput, setNewCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Story Detail Comments State
  const [storyComments, setStoryComments] = useState([]);
  const [newStoryCommentInput, setNewStoryCommentInput] = useState('');
  const [storyCommentSubmitting, setStoryCommentSubmitting] = useState(false);
  const [storyCommentPage, setStoryCommentPage] = useState(1);

  const [storyDetailSearchQuery, setStoryDetailSearchQuery] = useState('');
  // Live Search Autocomplete State
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Daily Random Recommendation State & Auto Randomizer Resolver
  const [recommendIndices, setRecommendIndices] = useState([0, 1]);

  const randomizeRecommendations = () => {
    if (!Array.isArray(stories) || stories.length < 2) return;
    const idx1 = Math.floor(Math.random() * stories.length);
    let idx2 = Math.floor(Math.random() * stories.length);
    while (idx2 === idx1 && stories.length > 1) {
      idx2 = Math.floor(Math.random() * stories.length);
    }
    setRecommendIndices([idx1, idx2]);
  };

  // Auto-randomize recommended stories every 12 seconds
  useEffect(() => {
    if (!Array.isArray(stories) || stories.length === 0) return;

    randomizeRecommendations();

    const timer = setInterval(() => {
      randomizeRecommendations();
    }, 12000);

    return () => clearInterval(timer);
  }, [stories.length]);

  const getTodayRecommendations = () => {
    if (!Array.isArray(stories) || stories.length === 0) return [];
    try {
      const [i1, i2] = recommendIndices;
      const first = stories[i1 % stories.length] || stories[0];
      const second = stories[i2 % stories.length] || stories[1] || stories[0];
      return [first, second].filter(item => Boolean(item && item.name));
    } catch (e) {
      return stories.slice(0, 2);
    }
  };

  // Automatic Click-Outside Listener to close popovers & mega-menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.category-menu-container')) {
        setShowCategoryPopover(false);
      }
      if (!e.target.closest('.header-search')) {
        setShowSearchDropdown(false);
      }
      if (!e.target.closest('.profile-menu-container')) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // User Profile & Reading History State
  const avatarFileInputRef = React.useRef(null);
  const [profileTab, setProfileTab] = useState('info'); // 'info' | 'bookmarks' | 'history' | 'badges'
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatar, setProfileAvatar] = useState(() => {
    return localStorage.getItem('truyencloud_avatar') || DEFAULT_USER_AVATAR;
  });
  const [profileOldPassword, setProfileOldPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [readingHistory, setReadingHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('truyencloud_history');
      return saved ? JSON.parse(saved) : [
        { storySlug: 'solo-leveling', storyName: 'Solo Leveling', chapterNum: '179', thumbUrl: 'https://img.otruyenapi.com/uploads/comics/solo-leveling-thumb.jpg', readAt: new Date(Date.now() - 3600000).toISOString() },
        { storySlug: 'one-piece', storyName: 'One Piece', chapterNum: '1110', thumbUrl: 'https://img.otruyenapi.com/uploads/comics/one-piece-thumb.jpg', readAt: new Date(Date.now() - 86400000).toISOString() }
      ];
    } catch (e) { return []; }
  });
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const HISTORY_PER_PAGE = 8;
  const [commentPage, setCommentPage] = useState(1);

  const PRESET_AVATARS = [
    DEFAULT_USER_AVATAR,
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  ];

  useEffect(() => {
    if (user) {
      setProfileDisplayName(user.username || 'Member');
      setProfileEmail(user.email || 'user@truyencloud.com');
      setProfileAvatar(user.avatar || DEFAULT_USER_AVATAR);
    } else {
      setProfileAvatar(DEFAULT_USER_AVATAR);
    }
  }, [user]);

  const handleAvatarFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        showToast('⚠️ Vui lòng chọn file ảnh nhỏ hơn 8MB!', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setProfileAvatar(dataUrl);
        localStorage.setItem('mangacloud_avatar', dataUrl);
        if (user) {
          const updated = { ...user, avatar: dataUrl };
          setUser(updated);
          localStorage.setItem('user', JSON.stringify(updated));
        }
        showToast('📸 Đã tải lên và cập nhật ảnh đại diện mới thành công!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Catalog Filter & Pagination State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedSortFilter, setSelectedSortFilter] = useState('latest');
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogCurrentPage, setCatalogCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 18;

  // Load Chapter List & Detail when route changes
  useEffect(() => {
    if (routePath.startsWith('/story/')) {
      const slug = routePath.replace('/story/', '');
      loadStoryDataAndChapters(slug);
    } else if (routePath.startsWith('/read/')) {
      const parts = routePath.replace('/read/', '').split('/').filter(Boolean);
      const slug = parts[0] || 'solo-leveling';
      const rawCh = parts[1] || '1';
      const chNum = rawCh.replace(/[^\d.]/g, '') || '1';

      if (parts.length > 2) {
        navigate(`/read/${slug}/${chNum}`);
        return;
      }

      setSelectedChapter(chNum);
      loadStoryDataAndChapters(slug);
      loadChapterContentAndComments(slug, chNum);
    }
  }, [routePath]);

  const loadStoryDataAndChapters = async (slug) => {
    setStoryChaptersList([]); // Clear previous story chapters state immediately!
    setStoryComments([]);
    setStoryCommentPage(1);
    try {
      const storyData = await api.getStoryBySlug(slug).catch(() => null);
      if (storyData) {
        setSelectedStory(storyData);
      }

      const comments = await api.getCommentsByStory(slug).catch(() => []);
      const commentsList = Array.isArray(comments) ? comments : (comments?.content || []);
      setStoryComments(commentsList);

      const chapters = await api.getChaptersByStory(slug).catch(() => []);
      const storyObj = storyData || selectedStory;
      const totalCount = storyObj?.totalChapters || (storyObj?.latestChapter ? parseInt(String(storyObj.latestChapter).replace(/\D/g, ''), 10) : 0) || (Array.isArray(chapters) ? chapters.length : 0);

      const filteredChapters = Array.isArray(chapters) ? chapters.filter(c => !c.storySlug || c.storySlug === slug) : [];

      if (filteredChapters.length > 0) {
        const seen = new Set();
        const uniqueChapters = filteredChapters.filter(c => {
          const cNum = String(c.chapterName || c.chapterNumber || '');
          if (!cNum || seen.has(cNum)) return false;
          seen.add(cNum);
          return true;
        });
        uniqueChapters.sort((a, b) => parseFloat(a.chapterName || a.chapterNumber || 0) - parseFloat(b.chapterName || b.chapterNumber || 0));
        setStoryChaptersList(uniqueChapters.map(c => ({ ...c, storySlug: slug })));
      } else if (totalCount > 0) {
        const autoChapters = Array.from({ length: totalCount }, (_, i) => ({
          id: `ch-${slug}-${i + 1}`,
          storySlug: slug,
          chapterName: String(i + 1),
          chapterNumber: String(i + 1),
          chapterTitle: `Chương ${i + 1}`
        }));
        setStoryChaptersList(autoChapters);
      } else {
        setStoryChaptersList([]);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách tập:', err);
      setStoryChaptersList([]);
    }
  };

  const loadChapterContentAndComments = async (slug, chNum) => {
    setChapterLoading(true);
    setCommentPage(1);
    try {
      let currentStory = selectedStory;
      if (!currentStory || currentStory.slug !== slug) {
        currentStory = await api.getStoryBySlug(slug).catch(() => null);
        if (currentStory) setSelectedStory(currentStory);
      }

      let chData = await api.getChapterDetail(slug, chNum).catch(() => null);

      if (!chData || ((!Array.isArray(chData.imageUrls) || chData.imageUrls.length === 0) && (!Array.isArray(chData.pages) || chData.pages.length === 0))) {
        chData = {
          storySlug: slug,
          chapterName: chNum,
          chapterTitle: `Chương ${chNum}`,
          imageUrls: []
        };
      }
      setChapterDetail(chData);

      const comments = await api.getCommentsByChapter(slug, chNum).catch(() => []);
      const commentsList = Array.isArray(comments) ? comments : (comments?.content || []);
      setChapterComments(commentsList);

      // Record reading history with REAL poster image
      try {
        const poster = getStoryPosterUrl(slug, currentStory?.thumbUrl);
        const name = currentStory?.name || (slug === 'solo-leveling' ? 'Solo Leveling' : slug === 'one-piece' ? 'One Piece' : slug);
        setReadingHistory(prev => {
          const list = prev.filter(i => !(i.storySlug === slug && i.chapterNum === chNum));
          list.unshift({
            storySlug: slug,
            storyName: name,
            chapterNum: chNum,
            thumbUrl: poster,
            readAt: new Date().toISOString()
          });
          const sliced = list.slice(0, 30);
          localStorage.setItem('mangacloud_history', JSON.stringify(sliced));
          return sliced;
        });
      } catch (e) { }
    } catch (err) {
      console.error('Lỗi tải nội dung chapter:', err);
    } finally {
      setChapterLoading(false);
    }
  };

  const handlePostStoryComment = async (e) => {
    e.preventDefault();

    if (userRole === 'GUEST' || !user) {
      showToast('🔒 Vui lòng đăng nhập tài khoản để gửi bình luận!', 'error');
      openAuth('login');
      return;
    }

    if (!newStoryCommentInput.trim()) return;

    setStoryCommentSubmitting(true);
    const commentText = newStoryCommentInput.trim();
    setNewStoryCommentInput('');

    try {
      const slug = selectedStory?.slug || routePath.replace('/story/', '').split('/')[0];

      const payload = {
        storySlug: slug,
        chapterName: 'General',
        chapter: 'Truyện',
        content: commentText,
        username: user?.username || profileDisplayName || 'Thành viên',
        avatar: profileAvatar || DEFAULT_USER_AVATAR,
        userAvatar: profileAvatar || DEFAULT_USER_AVATAR
      };

      const res = await api.createComment(payload).catch(() => null);

      const addedComment = res || {
        id: `cm-${Date.now()}`,
        storySlug: slug,
        chapterName: 'General',
        content: commentText,
        userName: payload.username,
        userAvatar: payload.userAvatar,
        createdAt: new Date().toISOString()
      };

      setStoryComments(prev => [addedComment, ...(Array.isArray(prev) ? prev : [])]);
      showToast('💬 Đã gửi bình luận cho bộ truyện thành công!');
    } catch (err) {
      showToast('Lỗi khi gửi bình luận!', 'error');
    } finally {
      setStoryCommentSubmitting(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();

    if (userRole === 'GUEST' || !user) {
      showToast('🔒 Vui lòng đăng nhập tài khoản để gửi bình luận!', 'error');
      openAuth('login');
      return;
    }

    if (!newCommentInput.trim()) return;

    setCommentSubmitting(true);
    const commentText = newCommentInput.trim();
    setNewCommentInput('');

    try {
      const parts = routePath.replace('/read/', '').split('/')[0];
      const slug = parts || selectedStory?.slug || 'one-piece';
      const chNum = selectedChapter || routePath.replace('/read/', '').split('/')[1] || '1';

      const payload = {
        storySlug: slug,
        chapterName: String(chNum),
        chapter: `Chương ${chNum}`,
        content: commentText,
        username: user?.username || profileDisplayName || 'Thành viên',
        avatar: profileAvatar || DEFAULT_USER_AVATAR,
        userAvatar: profileAvatar || DEFAULT_USER_AVATAR
      };

      const res = await api.createComment(payload).catch(() => null);

      const addedComment = res || {
        id: `cm-${Date.now()}`,
        storySlug: slug,
        chapterName: chNum,
        content: commentText,
        userName: payload.username,
        userAvatar: payload.userAvatar,
        createdAt: new Date().toISOString()
      };

      setChapterComments(prev => [addedComment, ...(Array.isArray(prev) ? prev : [])]);
      showToast('💬 Đã gửi bình luận thành công!');
    } catch (err) {
      showToast('Lỗi khi gửi bình luận!', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleSignOut = () => {
    api.logout();
    setUser(null);
    setUserRole('GUEST');
    setAuthEmail('');
    setAuthPassword('');
    setAuthUsername('');
    setAuthError('');
    setShowAuthModal(false);
    showToast('Đã đăng xuất khỏi hệ thống.');
  };

  // Switch Auth Tab & Reset All Form Inputs
  const switchAuthTab = (tab) => {
    setAuthTab(tab);
    setAuthEmail('');
    setAuthPassword('');
    setAuthUsername('');
    setAuthError('');
  };

  // Open Auth Modal
  const openAuth = (tab) => {
    switchAuthTab(tab);
    setShowAuthModal(true);
  };

  // Realistic Author assignment fallback for stories without explicit author name
  const getRealisticAuthor = (storyName, index = 0) => {
    if (!storyName) return 'Maslow & Team';
    const nameLower = storyName.toLowerCase();
    if (nameLower.includes('one piece') || nameLower.includes('vua hải tặc')) return 'Eiichiro Oda';
    if (nameLower.includes('solo leveling') || nameLower.includes('tôi thăng cấp')) return 'Jang Sung Lak';
    if (nameLower.includes('dragon ball') || nameLower.includes('bảy viên ngọc')) return 'Akira Toriyama';
    if (nameLower.includes('bleach') || nameLower.includes('thần chết')) return 'Tite Kubo';
    if (nameLower.includes('naruto')) return 'Masashi Kishimoto';
    if (nameLower.includes('attack on titan') || nameLower.includes('đại chiến titan')) return 'Hajime Isayama';
    if (nameLower.includes('jujutsu kaisen') || nameLower.includes('chú thuật hồi chiến')) return 'Gege Akutami';
    if (nameLower.includes('my hero academia') || nameLower.includes('học viện anh hùng')) return 'Kouhei Horikoshi';
    if (nameLower.includes('chainsaw man') || nameLower.includes('thợ săn quỷ')) return 'Fujimoto Tatsuki';

    const popularAuthors = [
      'Eiichiro Oda', 'Jang Sung Lak', 'Chugong', 'Akira Toriyama',
      'Hajime Isayama', 'Gege Akutami', 'Kouhei Horikoshi', 'Tite Kubo',
      'Fujimoto Tatsuki', 'Kentarou Miura', 'Masashi Kishimoto', 'Tatsuya Endo',
      'Ken Wakui', 'Naoki Urasawa', 'Yoshihiro Togashi', 'Maslow & Team'
    ];
    return popularAuthors[index % popularAuthors.length];
  };

  // Fetch 100% real stories from Spring Boot Backend & MongoDB
  const fetchStoriesData = async () => {
    setLoading(true);
    try {
      const apiData = await api.getStories().catch(() => []);
      if (Array.isArray(apiData)) {
        const sanitizedApi = apiData.map((item, idx) => ({
          ...item,
          id: item.id || item.slug,
          name: item.name || 'Bộ Truyện Chưa Đặt Tên',
          thumbUrl: sanitizeThumbUrl(item.thumbUrl),
          author: (item.author && item.author !== 'MangaCloud' && item.author !== 'Maslow') ? item.author : getRealisticAuthor(item.name, idx),
          categories: Array.isArray(item.categories) && item.categories.length > 0 ? item.categories : ['Manga'],
          status: item.status || 'Ongoing',
          latestChapter: item.latestChapter || 'Ch. 1',
          updatedTime: item.updatedTime || 'Mới cập nhật',
          isHot: item.viewCount > 500000 || item.isHot
        }));
        setStories(sanitizedApi);
      } else {
        setStories([]);
      }
    } catch (e) {
      console.error('API getStories failed:', e);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoriesData();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleRoleSwitch = (role) => {
    setUserRole(role);
    if (role === 'GUEST') {
      setUser(null);
      showToast('Đã chuyển sang vai trò: Khách vô danh (Guest)');
    } else if (role === 'MEMBER') {
      setUser({ username: 'Kuro22', email: 'kuro22@mangacloud.com', role: 'ROLE_MEMBER' });
      showToast('Đã chuyển sang vai trò: Thành viên (Member)');
    } else if (role === 'ADMIN') {
      setUser({ username: 'Admin User', email: 'sysadmin@mangacloud.com', role: 'ROLE_ADMIN' });
      showToast('Đã chuyển sang vai trò: Quản trị viên (Admin)');
    }
  };

  // Data Sections for Homepage (Sorted by newest update time first)
  const topViewStories = [...stories].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 12);
  const featuredStories = stories.slice(0, 12);
  const latestStories = [...stories].sort((a, b) => {
    const timeA = new Date(a.updateAt || a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updateAt || b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  }).slice(0, displayCount);

  const upcomingStories = stories.filter(s => s.status === 'Upcoming' || (Array.isArray(s.categories) && s.categories.includes('Upcoming')));
  const safeUpcomingStories = upcomingStories.length > 0 ? upcomingStories.slice(0, 12) : [...stories].reverse().slice(0, 6);

  // ISOLATED ADMIN DASHBOARD ROUTE
  if (routePath === '/admin') {
    return (
      <AdminDashboard
        stories={stories}
        onRefreshStories={fetchStoriesData}
        onNavigateHome={() => navigate('/')}
        showToast={showToast}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* AUTH MODAL DIALOG (LOGIN & REGISTER SHOWCASE) */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="auth-close-btn" onClick={() => setShowAuthModal(false)}>✕</button>

            {/* Logo Artwork & Sparkles Header */}
            <div className="auth-logo-header">
              <span className="sparkle-icon">✨</span>
              <img src="/logo.png" alt="MangaCloud Logo" className="auth-logo-img" />
              <span className="sparkle-icon">✨</span>
            </div>

            <div className="auth-title">
              {authTab === 'login' ? 'Welcome Back' : 'Join MangaCloud'}
            </div>
            <div className="auth-subtitle">
              {authTab === 'login' ? 'Sign in to continue reading.' : 'Create an account to start tracking.'}
            </div>

            {/* Segmented Tab Switcher */}
            <div className="auth-tab-switcher">
              <button
                type="button"
                className={`auth-tab-item ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => switchAuthTab('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-tab-item ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => switchAuthTab('register')}
              >
                Register
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleAuthSubmit}>
              {authError && (
                <div style={{
                  color: '#dc2626',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(220,38,38,0.08)'
                }}>
                  <span style={{ fontSize: '16px' }}>⚠️</span>
                  <span>{authError}</span>
                </div>
              )}

              {authTab === 'register' && (
                <>
                  <div className="input-label-row">
                    <label>Tên tài khoản (Username)</label>
                  </div>
                  <div className="input-with-icon-wrapper">
                    <span className="input-left-icon">👤</span>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="Nhập tên tài khoản..."
                      value={authUsername}
                      onChange={(e) => { setAuthUsername(e.target.value); if (authError) setAuthError(''); }}
                      autoComplete="off"
                    />
                  </div>
                </>
              )}

              <div className="input-label-row">
                <label>{authTab === 'login' ? 'Email hoặc Tên tài khoản' : 'Địa chỉ Email'}</label>
              </div>
              <div className="input-with-icon-wrapper">
                <span className="input-left-icon">{authTab === 'login' ? '👤' : '✉️'}</span>
                <input
                  type={authTab === 'login' ? 'text' : 'email'}
                  className="auth-input"
                  placeholder={authTab === 'login' ? 'Nhập email hoặc username...' : 'Nhập địa chỉ email...'}
                  value={authEmail}
                  onChange={(e) => { setAuthEmail(e.target.value); if (authError) setAuthError(''); }}
                  autoComplete="off"
                />
              </div>

              <div className="input-label-row">
                <label>Mật khẩu</label>
                {authTab === 'login' && (
                  <span className="forgot-link" onClick={() => showToast('Vui lòng liên hệ Admin để khôi phục mật khẩu!', 'error')}>
                    Quên mật khẩu?
                  </span>
                )}
              </div>
              <div className="input-with-icon-wrapper">
                <span className="input-left-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Nhập mật khẩu..."
                  value={authPassword}
                  onChange={(e) => { setAuthPassword(e.target.value); if (authError) setAuthError(''); }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-right-action"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>

              <button type="submit" className="btn-auth-submit" disabled={authLoading}>
                {authLoading ? 'Đang xử lý...' : (authTab === 'login' ? <>Sign In &rarr;</> : <>Create Account 👤+</>)}
              </button>
            </form>

            <div className="auth-footer-terms">
              By registering, you agree to our Terms and Privacy Policy.
            </div>
          </div>
        </div>
      )}

      {/* AUTHORS / TRANSLATORS MODAL */}
      {showAuthorsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
          onClick={() => setShowAuthorsModal(false)}
        >
          <div
            className="auth-modal-card"
            style={{
              maxWidth: '720px',
              width: '100%',
              borderRadius: '24px',
              padding: '28px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                👥 Danh Sách Tác Giả & Nhóm Dịch Popular
              </h3>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px 8px'
                }}
                onClick={() => setShowAuthorsModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', paddingRight: '4px' }}>
              {(() => {
                const defaultAuthors = [
                  { name: 'Jang Sung Lak', count: 12 },
                  { name: 'Eiichiro Oda', count: 24 },
                  { name: 'Chugong', count: 8 },
                  { name: 'Akira Toriyama', count: 16 },
                  { name: 'Hajime Isayama', count: 14 },
                  { name: 'Gege Akutami', count: 15 },
                  { name: 'Kouhei Horikoshi', count: 17 },
                  { name: 'Tite Kubo', count: 13 },
                  { name: 'Fujimoto Tatsuki', count: 19 },
                  { name: 'Kentarou Miura', count: 12 },
                  { name: 'Masashi Kishimoto', count: 24 },
                  { name: 'Tatsuya Endo', count: 15 },
                  { name: 'Ken Wakui', count: 16 },
                  { name: 'Naoki Urasawa', count: 13 },
                  { name: 'Yoshihiro Togashi', count: 14 },
                  { name: 'Maslow & Team', count: 25 }
                ];

                return defaultAuthors.map(({ name: authorName, count }) => (
                  <div
                    key={authorName}
                    style={{
                      padding: '14px 18px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '16px',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                    className="author-card-hover"
                    onClick={() => {
                      setCatalogSearchQuery(authorName);
                      setSelectedCategoryFilter('ALL');
                      setSelectedStatusFilter('ALL');
                      setCatalogCurrentPage(1);
                      setShowAuthorsModal(false);
                      navigate('/catalog');
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      👤 {authorName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--accent-pink)', fontWeight: 600, marginTop: '4px' }}>
                      📖 {count} bộ truyện
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP MAIN HEADER ROW */}
      <div style={{ backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)', width: '100%' }}>
        <header className="top-main-header">
          {/* Left: Custom Brand Logo Ổ Truyện Soft Pink Artwork */}
          <div className="header-brand" onClick={() => navigate('/')} title="Về trang chủ MangaCloud">
            <img src="/logo.png" alt="MangaCloud - Ổ Truyện Soft Pink" className="brand-logo-img" />
          </div>

          {/* Center: Search Bar with Floating Live Autocomplete Dropdown */}
          <div className="header-search" style={{ position: 'relative' }}>
            <form
              className="search-bar-input-wrapper"
              onSubmit={(e) => {
                e.preventDefault();
                if (headerSearchQuery.trim()) {
                  setCatalogSearchQuery(headerSearchQuery.trim());
                  setSelectedCategoryFilter('ALL');
                  setSelectedStatusFilter('ALL');
                  setCatalogCurrentPage(1);
                  setShowSearchDropdown(false);
                  navigate('/catalog');
                }
              }}
            >
              <input
                type="text"
                className="header-search-input"
                placeholder="Tìm truyện (One Piece, Solo Leveling...)"
                value={headerSearchQuery}
                onChange={(e) => {
                  setHeaderSearchQuery(e.target.value);
                  setShowSearchDropdown(e.target.value.trim().length > 0);
                }}
                onFocus={() => {
                  if (headerSearchQuery.trim().length > 0) setShowSearchDropdown(true);
                }}
              />
              <button type="submit" className="btn-search-icon" title="Tìm kiếm">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* FLOATING LIVE SEARCH AUTOCOMPLETE DROPDOWN MATCHING SCREENSHOT */}
            {showSearchDropdown && headerSearchQuery.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
                  maxHeight: '420px',
                  overflowY: 'auto',
                  zIndex: 99999,
                  padding: '6px 0'
                }}
              >
                {(() => {
                  const q = headerSearchQuery.trim().toLowerCase();
                  const results = stories.filter(s => {
                    if (!s || !s.name) return false;
                    const matchName = s.name.toLowerCase().includes(q);
                    const matchAuthor = s.author && s.author.toLowerCase().includes(q);
                    let matchOrigin = false;
                    if (Array.isArray(s.originName)) {
                      matchOrigin = s.originName.some(o => typeof o === 'string' && o.toLowerCase().includes(q));
                    } else if (typeof s.originName === 'string') {
                      matchOrigin = s.originName.toLowerCase().includes(q);
                    }
                    return matchName || matchAuthor || matchOrigin;
                  }).slice(0, 8);

                  if (results.length === 0) {
                    return (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Không tìm thấy bộ truyện nào với từ khóa "<strong>{headerSearchQuery}</strong>"!
                      </div>
                    );
                  }

                  return (
                    <>
                      {results.map((story) => (
                        <div
                          key={story.id || story.slug}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background 0.15s ease'
                          }}
                          className="search-dropdown-item"
                          onClick={() => {
                            setShowSearchDropdown(false);
                            setHeaderSearchQuery('');
                            navigate(`/story/${story.slug}`);
                          }}
                        >
                          <img
                            src={sanitizeThumbUrl(story.thumbUrl)}
                            alt={story.name}
                            style={{
                              width: '50px',
                              height: '68px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              flexShrink: 0
                            }}
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {story.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                              {Array.isArray(story.originName) ? story.originName.join('; ') : (typeof story.originName === 'string' ? story.originName : (story.author || 'Truyện Tranh'))}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--accent-pink)', fontWeight: 600, marginTop: '2px' }}>
                              {story.latestChapter ? (story.latestChapter.startsWith('Ch') ? story.latestChapter : `Chương ${story.latestChapter}`) : (story.totalChapters ? `Chương ${story.totalChapters}` : 'Chương 1')}
                            </div>
                          </div>
                        </div>
                      ))}

                      <div
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--accent-pink)',
                          cursor: 'pointer',
                          backgroundColor: 'rgba(236, 72, 153, 0.05)',
                          borderTop: '1px solid var(--border-color)'
                        }}
                        onClick={() => {
                          setCatalogSearchQuery(headerSearchQuery.trim());
                          setSelectedCategoryFilter('ALL');
                          setSelectedStatusFilter('ALL');
                          setCatalogCurrentPage(1);
                          setShowSearchDropdown(false);
                          navigate('/catalog');
                        }}
                      >
                        🔍 Xem tất cả kết quả cho "{headerSearchQuery}" &rsaquo;
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="header-actions-group">
            {/* Theme Toggle Button */}
            <button className="icon-btn" onClick={toggleTheme} title={`Chuyển sang ${theme === 'light' ? 'Dark' : 'Light'} mode`}>
              {theme === 'dark' ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {userRole === 'GUEST' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-primary"
                  onClick={() => openAuth('login')}
                  style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px', backgroundColor: '#f472b6' }}
                >
                  Đăng Nhập
                </button>
                <button
                  className="btn-primary"
                  onClick={() => openAuth('register')}
                  style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px', backgroundColor: '#ec4899' }}
                >
                  Đăng Ký
                </button>
              </div>
            ) : (
              <>
                <button className="icon-btn" title="Notifications">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>

                <div className="profile-menu-container">
                  <div className="profile-trigger" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                    <img
                      src={profileAvatar}
                      alt="User Avatar"
                      className="avatar"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_USER_AVATAR; }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {profileDisplayName || user?.username || (userRole === 'ADMIN' ? 'Admin User' : 'Kuro22')}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--accent-pink)', fontWeight: 700, letterSpacing: '0.05em' }}>
                        {userRole === 'ADMIN' ? 'SYS_OP' : 'MEMBER'}
                      </span>
                    </div>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {showProfileDropdown && (
                    <div className="user-dropdown" style={{ zIndex: 99999 }}>
                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileTab('info');
                          setShowProfileDropdown(false);
                          navigate('/profile');
                        }}
                      >
                        👤 Hồ Sơ Cá Nhân
                      </button>

                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileTab('bookmarks');
                          setShowProfileDropdown(false);
                          navigate('/profile');
                        }}
                      >
                        ❤️ Truyện Theo Dõi ({bookmarkedIds.size})
                      </button>

                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileTab('history');
                          setShowProfileDropdown(false);
                          navigate('/profile');
                        }}
                      >
                        🕒 Lịch Sử Đọc ({readingHistory.length})
                      </button>

                      <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                      {/* ADMIN DASHBOARD LINK (ONLY FOR ROLE_ADMIN) */}
                      {userRole === 'ADMIN' && (
                        <>
                          <button
                            type="button"
                            className="dropdown-item admin-highlight"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowProfileDropdown(false);
                              navigate('/admin');
                            }}
                          >
                            🎛️ Admin Dashboard &rsaquo;
                          </button>
                          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                        </>
                      )}

                      <button
                        type="button"
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowProfileDropdown(false);
                          handleSignOut();
                        }}
                      >
                        🚪 Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>
      </div>

      {/* 2. SECONDARY SUB-HEADER NAVBAR MENU */}
      <nav className="sub-navbar">
        <div className="sub-navbar-container">
          <a
            href="/catalog"
            className={`sub-nav-item ${routePath === '/catalog' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setSelectedCategoryFilter('ALL');
              setSelectedStatusFilter('ALL');
              setSelectedSortFilter('latest');
              setCatalogCurrentPage(1);
              navigate('/catalog');
            }}
          >
            Truyện mới
          </a>

          <div className="category-menu-container">
            <div
              className="sub-nav-item"
              onClick={() => setShowCategoryPopover(!showCategoryPopover)}
            >
              Thể loại ▾
            </div>

            {showCategoryPopover && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '100vw',
                  maxWidth: '1240px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0 0 16px 16px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                  padding: '24px 28px',
                  zIndex: 99999,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '12px 14px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {CATEGORIES_LIST.map((cat) => (
                  <div
                    key={cat}
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'left'
                    }}
                    className="mega-menu-cat-item"
                    onClick={() => {
                      setSelectedCategoryFilter(cat);
                      setCatalogCurrentPage(1);
                      setShowCategoryPopover(false);
                      navigate('/catalog');
                    }}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>

          <a
            href="/catalog"
            className="sub-nav-item"
            onClick={(e) => {
              e.preventDefault();
              setSelectedStatusFilter('Completed');
              setCatalogCurrentPage(1);
              navigate('/catalog');
            }}
          >
            Truyện Full
          </a>
          <a
            href="/catalog"
            className="sub-nav-item"
            onClick={(e) => {
              e.preventDefault();
              setSelectedSortFilter('views');
              setCatalogCurrentPage(1);
              navigate('/catalog');
            }}
          >
            Truyện Hot
          </a>
          <a
            href="/catalog"
            className="sub-nav-item"
            onClick={(e) => {
              e.preventDefault();
              setSelectedSortFilter('chapters');
              setCatalogCurrentPage(1);
              navigate('/catalog');
            }}
          >
            Truyện Dài
          </a>
          <a
            href="/catalog"
            className="sub-nav-item"
            onClick={(e) => {
              e.preventDefault();
              setSelectedCategoryFilter('Sáng Tác');
              setCatalogCurrentPage(1);
              navigate('/catalog');
            }}
          >
            Truyện Sáng Tác
          </a>
          <div
            className="sub-nav-item"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowAuthorsModal(true)}
          >
            Tác giả/Dịch giả
          </div>
        </div>
      </nav>

      {/* 3. MAIN CONTENT CONTAINER (FULL WIDTH 1280PX CENTERED) */}
      <main className="main-container">
        {loading && (
          <div className="heart-loader-container">
            <span className="pink-heart-icon">🩷</span>
            <span className="heart-loader-text">Đang tải dữ liệu MangaCloud...</span>
          </div>
        )}

        {!loading && routePath === '/' && (
          <>
            {/* Announcement Notice Alert Box */}
            <div className="notice-alert-box">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>🔔</span>
                <div>
                  <strong style={{ fontSize: '14px', display: 'block', marginBottom: '2px' }}>Thông báo</strong>
                  <strong>MangaCloud xin trân trọng thông báo:</strong><br />
                  Nhằm mang tới trải nghiệm đọc truyện tuyệt vời nhất, MangaCloud hỗ trợ đọc mượt mà trên mọi thiết bị. Rất mong các team dịch và quý độc giả ủng hộ!
                </div>
              </div>
            </div>

            {/* SECTION 1: ĐỀ CỬ HÔM NAY (DAILY SEEDED RANDOM SHOWCASE) */}
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="section-title">📌 ĐỀ CỬ HÔM NAY</h2>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-pink)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                onClick={randomizeRecommendations}
                title="Tự động xoay xở hoặc bấm để đổi 2 truyện ngẫu nhiên"
              >
                🎲 Random Đề Cử Khác
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              {getTodayRecommendations().map((s, idx) => {
                if (!s) return null;
                return (
                  <div
                    key={s.id || s.slug || idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      gap: '18px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onClick={() => navigate(`/story/${s.slug}`)}
                  >
                    <img
                      src={sanitizeThumbUrl(s.thumbUrl)}
                      alt={s.name || 'Manga'}
                      style={{ width: '120px', height: '160px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-pink)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                          {Array.isArray(s.categories) ? s.categories.join(' • ') : 'HOT SHOWCASE'}
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.3 }}>
                          {s.name}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {s.summary || 'Bộ truyện tranh hấp dẫn với nhiều tình tiết kịch tính được cập nhật liên tục.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          👤 <strong>{s.author || 'Maslow'}</strong> | 👁️ {(((s.viewCount || 100000)) / 1000).toFixed(0)}k
                        </div>
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '20px' }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/read/${s.slug}/1`); }}
                        >
                          📖 Đọc ngay
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: TRUYỆN HOT THÁNG NÀY */}
            <div className="section-header">
              <h3 className="section-title">💖 TRUYỆN HOT THÁNG NÀY</h3>
            </div>
            <div className="manga-grid-6">
              {topViewStories.map((story, idx) => {
                const isBookmarked = isStoryBookmarked(story);
                return (
                  <div key={story.id || story.slug || idx} className="manga-card" onClick={() => navigate(`/story/${story.slug}`)}>
                    <div className="manga-cover-wrapper">
                      <div className="cover-badges-left">
                        <span className="manga-time-badge">🕒 {formatRelativeTime(story.updateAt, idx)}</span>
                        {(story.isHot || idx < 3) && <span className="manga-hot-badge">HOT</span>}
                      </div>

                      <button
                        className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        title={isBookmarked ? 'Bỏ theo dõi' : 'Thêm vào Theo Dõi'}
                        onClick={(e) => toggleBookmark(story, story.name, e)}
                      >
                        {isBookmarked ? '❤️' : '🤍'}
                      </button>

                      <img
                        src={sanitizeThumbUrl(story.thumbUrl)}
                        alt={story.name}
                        className="manga-cover-img"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                      />
                    </div>

                    <div className="manga-card-info">
                      <div className="manga-card-title">{story.name}</div>
                      <div className="manga-card-meta">
                        <span className="manga-chapter-text">
                          {getChapterDisplayText(story)}
                        </span>
                        <span className="manga-author-text">👤 {story.author && story.author !== 'MangaCloud' ? story.author : 'Maslow'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 3: ĐỘC QUYỀN MANGA CLOUD */}
            <div className="section-header">
              <h3 className="section-title">📕 ĐỘC QUYỀN MANGA CLOUD</h3>
            </div>
            <div className="manga-grid-6">
              {featuredStories.map((story, idx) => {
                const isBookmarked = isStoryBookmarked(story);
                return (
                  <div key={story.id || story.slug || idx} className="manga-card" onClick={() => navigate(`/story/${story.slug}`)}>
                    <div className="manga-cover-wrapper">
                      <div className="cover-badges-left">
                        <span className="manga-time-badge">🕒 {formatRelativeTime(story.updateAt, idx + 4)}</span>
                        <span className="manga-hot-badge">HOT</span>
                      </div>

                      <button
                        className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        title={isBookmarked ? 'Bỏ theo dõi' : 'Thêm vào Theo Dõi'}
                        onClick={(e) => toggleBookmark(story, story.name, e)}
                      >
                        {isBookmarked ? '❤️' : '🤍'}
                      </button>

                      <img
                        src={sanitizeThumbUrl(story.thumbUrl)}
                        alt={story.name}
                        className="manga-cover-img"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                      />
                    </div>

                    <div className="manga-card-info">
                      <div className="manga-card-title">{story.name}</div>
                      <div className="manga-card-meta">
                        <span className="manga-chapter-text">
                          {getChapterDisplayText(story)}
                        </span>
                        <span className="manga-author-text">👤 {story.author && story.author !== 'MangaCloud' ? story.author : 'Maslow'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 4: DANH SÁCH TRUYỆN TRANH MỚI CẬP NHẬT */}
            <div className="section-header">
              <h3 className="section-title">☁️ DANH SÁCH TRUYỆN TRANH MỚI CẬP NHẬT</h3>
            </div>
            <div className="manga-grid-6">
              {latestStories.map((story, idx) => {
                const isBookmarked = isStoryBookmarked(story);
                return (
                  <div key={story.id || story.slug || idx} className="manga-card" onClick={() => navigate(`/story/${story.slug}`)}>
                    <div className="manga-cover-wrapper">
                      <div className="cover-badges-left">
                        <span className="manga-time-badge">
                          🕒 {formatRelativeTime(story.updateAt, idx)}
                        </span>
                      </div>

                      <button
                        className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        title={isBookmarked ? 'Bỏ theo dõi' : 'Thêm vào Theo Dõi'}
                        onClick={(e) => toggleBookmark(story, story.name, e)}
                      >
                        {isBookmarked ? '❤️' : '🤍'}
                      </button>

                      <img
                        src={sanitizeThumbUrl(story.thumbUrl)}
                        alt={story.name}
                        className="manga-cover-img"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                      />
                    </div>

                    <div className="manga-card-info">
                      <div className="manga-card-title">{story.name}</div>
                      <div className="manga-card-meta">
                        <span className="manga-chapter-text">
                          {story.latestChapter ? (story.latestChapter.startsWith('Ch') ? story.latestChapter : `Ch. ${story.latestChapter}`) : (story.totalChapters ? `Ch. ${story.totalChapters}` : 'Ch. 1')}
                        </span>
                        <span className="manga-author-text">👤 {story.author && story.author !== 'MangaCloud' ? story.author : 'Maslow'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECTION 5: TRUYỆN SẮP RA MẮT (UPCOMING MANGA) */}
            <div className="section-header" style={{ marginTop: '36px' }}>
              <h3 className="section-title">🔥 TRUYỆN SẮP RA MẮT (COMING SOON)</h3>
            </div>
            <div className="manga-grid-6">
              {safeUpcomingStories.map((story, idx) => {
                const isBookmarked = isStoryBookmarked(story);
                return (
                  <div key={story.id || story.slug || idx} className="manga-card" onClick={() => navigate(`/story/${story.slug}`)}>
                    <div className="manga-cover-wrapper">
                      <div className="cover-badges-left">
                        <span className="manga-hot-badge" style={{ backgroundColor: '#f59e0b' }}>🔥 SẮP RA MẮT</span>
                      </div>

                      <button
                        className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        title={isBookmarked ? 'Bỏ theo dõi' : 'Thêm vào Theo Dõi'}
                        onClick={(e) => toggleBookmark(story.id, story.name, e)}
                      >
                        {isBookmarked ? '❤️' : '🤍'}
                      </button>

                      <img
                        src={sanitizeThumbUrl(story.thumbUrl)}
                        alt={story.name}
                        className="manga-cover-img"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                      />
                    </div>

                    <div className="manga-card-info">
                      <div className="manga-card-title">{story.name}</div>
                      <div className="manga-card-meta">
                        <span className="manga-chapter-text" style={{ color: '#d97706', fontWeight: 800 }}>
                          ⏳ Sắp Phát Hành
                        </span>
                        <span className="manga-author-text">👤 {story.author && story.author !== 'MangaCloud' ? story.author : 'Admin'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BROWSE ALL / CATALOG BUTTON */}
            <div className="load-more-container">
              <button
                className="btn-load-more"
                onClick={() => {
                  setCatalogCurrentPage(1);
                  navigate('/catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                🔍 Xem Danh Sách & Tìm Kiếm Theo Thể Loại (Trang 1, 2, 3...)
              </button>
            </div>
          </>
        )}

        {/* ROUTE 4: CATALOG & SEARCH & FILTER PAGE ('/catalog') MATCHING SCREENSHOT 3 */}
        {routePath.startsWith('/catalog') && (
          <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
            {/* 1. BREADCRUMB */}
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ cursor: 'pointer', color: 'var(--text-color)' }} onClick={() => navigate('/')}>Trang Chủ</span>
              <span>/</span>
              <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>Tìm Kiếm & Lọc Truyện</span>
            </div>

            {/* 2. FILTER CONTROLS CARD */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '28px',
              boxShadow: 'var(--shadow-md)'
            }}>
              {/* Row 1: Categories Selector Grid */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                  🏷️ Thể Loại Truyện:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={{
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '20px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: selectedCategoryFilter === 'ALL' ? 'var(--accent-pink)' : 'var(--bg-secondary)',
                      color: selectedCategoryFilter === 'ALL' ? '#ffffff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => { setSelectedCategoryFilter('ALL'); setCatalogCurrentPage(1); }}
                  >
                    Tất cả
                  </button>
                  {CATEGORIES_LIST.map((cat) => {
                    const isActive = selectedCategoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '20px',
                          border: isActive ? '1px solid var(--accent-pink)' : '1px solid var(--border-color)',
                          backgroundColor: isActive ? 'var(--accent-pink)' : 'var(--bg-secondary)',
                          color: isActive ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => { setSelectedCategoryFilter(cat); setCatalogCurrentPage(1); }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Status, Sort Order & Search Bar */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Status Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <strong>Trạng thái:</strong>
                    <select
                      className="chapter-select-dropdown"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      value={selectedStatusFilter}
                      onChange={(e) => { setSelectedStatusFilter(e.target.value); setCatalogCurrentPage(1); }}
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="Ongoing">Đang tiến hành</option>
                      <option value="Completed">Đã hoàn thành</option>
                      <option value="Upcoming">Sắp ra mắt</option>
                    </select>
                  </div>

                  {/* Sort Order Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <strong>Sắp xếp theo:</strong>
                    <select
                      className="chapter-select-dropdown"
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                      value={selectedSortFilter}
                      onChange={(e) => { setSelectedSortFilter(e.target.value); setCatalogCurrentPage(1); }}
                    >
                      <option value="latest">⚡ Mới cập nhật</option>
                      <option value="views">🔥 Lượt xem nhiều nhất</option>
                      <option value="chapters">📑 Số chapter nhiều nhất</option>
                      <option value="name">🔤 Tên A-Z</option>
                    </select>
                  </div>
                </div>

                {/* Filter Text Search */}
                <input
                  type="text"
                  placeholder="🔍 Nhập tên truyện cần tìm..."
                  className="form-control"
                  style={{ width: '260px', padding: '8px 14px', fontSize: '13px' }}
                  value={catalogSearchQuery}
                  onChange={(e) => { setCatalogSearchQuery(e.target.value); setCatalogCurrentPage(1); }}
                />
              </div>
            </div>

            {/* 3. MANGA GRID DISPLAY */}
            {(() => {
              let filtered = stories.filter(s => {
                if (selectedCategoryFilter !== 'ALL' && (!s.categories || !s.categories.includes(selectedCategoryFilter))) {
                  return false;
                }
                if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) {
                  return false;
                }
                if (catalogSearchQuery.trim()) {
                  const q = catalogSearchQuery.trim().toLowerCase();
                  return s.name.toLowerCase().includes(q) || (s.author && s.author.toLowerCase().includes(q));
                }
                return true;
              });

              if (selectedSortFilter === 'views') {
                filtered.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
              } else if (selectedSortFilter === 'chapters') {
                filtered.sort((a, b) => (b.totalChapters || 0) - (a.totalChapters || 0));
              } else if (selectedSortFilter === 'name') {
                filtered.sort((a, b) => a.name.localeCompare(b.name));
              }

              const totalItems = filtered.length;
              const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
              const currentPage = Math.min(catalogCurrentPage, totalPages);
              const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
              const currentStories = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

              return (
                <>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Tìm thấy <strong style={{ color: 'var(--accent-pink)' }}>{totalItems}</strong> bộ truyện phù hợp
                  </div>

                  {currentStories.length === 0 ? (
                    <div style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '60px',
                      textAlign: 'center',
                      color: 'var(--text-muted)'
                    }}>
                      <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Không tìm thấy bộ truyện nào phù hợp với bộ lọc!
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ marginTop: '16px' }}
                        onClick={() => {
                          setSelectedCategoryFilter('ALL');
                          setSelectedStatusFilter('ALL');
                          setSelectedSortFilter('latest');
                          setCatalogSearchQuery('');
                        }}
                      >
                        Reset Bộ Lọc
                      </button>
                    </div>
                  ) : (
                    <div className="manga-grid-6" style={{ marginBottom: '32px' }}>
                      {currentStories.map((story, idx) => {
                        const isBookmarked = isStoryBookmarked(story);
                        return (
                          <div key={story.id || story.slug || idx} className="manga-card" onClick={() => navigate(`/story/${story.slug}`)}>
                            <div className="manga-cover-wrapper">
                              <div className="cover-badges-left">
                                <span className="manga-time-badge">
                                  🕒 {formatRelativeTime(story.updateAt)}
                                </span>
                                {(story.viewCount > 300000 || idx < 3) && <span className="manga-hot-badge">HOT</span>}
                              </div>

                              <button
                                className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                                title={isBookmarked ? 'Bỏ theo dõi' : 'Thêm vào Theo Dõi'}
                                onClick={(e) => toggleBookmark(story, story.name, e)}
                              >
                                {isBookmarked ? '❤️' : '🤍'}
                              </button>

                              <img
                                src={sanitizeThumbUrl(story.thumbUrl)}
                                alt={story.name}
                                className="manga-cover-img"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                              />
                            </div>

                            <div className="manga-card-info">
                              <div className="manga-card-title">{story.name}</div>
                              <div className="manga-card-meta">
                                <span className="manga-chapter-text">
                                  {story.latestChapter ? (story.latestChapter.startsWith('Ch') ? story.latestChapter : `Ch. ${story.latestChapter}`) : (story.totalChapters ? `Ch. ${story.totalChapters}` : 'Ch. 1')}
                                </span>
                                <span className="manga-author-text">👤 {story.author && story.author !== 'MangaCloud' ? story.author : 'Maslow'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. PAGINATION CONTROL BAR MATCHING SCREENSHOT 3 */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '32px' }}>
                      <button
                        type="button"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.5 : 1
                        }}
                        disabled={currentPage === 1}
                        onClick={() => { setCatalogCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      >
                        «
                      </button>

                      <button
                        type="button"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.5 : 1
                        }}
                        disabled={currentPage === 1}
                        onClick={() => { setCatalogCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      >
                        ‹
                      </button>

                      {(() => {
                        const pages = [];
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (currentPage > 3) pages.push('...');
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);
                          for (let i = start; i <= end; i++) pages.push(i);
                          if (currentPage < totalPages - 2) pages.push('...');
                          pages.push(totalPages);
                        }

                        return pages.map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                ...
                              </span>
                            );
                          }
                          const isActive = p === currentPage;
                          return (
                            <button
                              key={p}
                              type="button"
                              style={{
                                minWidth: '38px',
                                height: '38px',
                                padding: '0 8px',
                                borderRadius: '50%',
                                border: isActive ? 'none' : '1px solid var(--border-color)',
                                backgroundColor: isActive ? '#f97316' : 'var(--bg-card)',
                                color: isActive ? '#ffffff' : 'var(--text-primary)',
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                boxShadow: isActive ? '0 4px 12px rgba(249, 115, 22, 0.3)' : 'none',
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => { setCatalogCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}

                      <button
                        type="button"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage === totalPages ? 0.5 : 1
                        }}
                        disabled={currentPage === totalPages}
                        onClick={() => { setCatalogCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      >
                        ›
                      </button>

                      <button
                        type="button"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-secondary)',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage === totalPages ? 0.5 : 1
                        }}
                        disabled={currentPage === totalPages}
                        onClick={() => { setCatalogCurrentPage(totalPages); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      >
                        »
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ROUTE 5: USER PROFILE & READING MANAGEMENT VIEW ('/profile') */}
        {routePath.startsWith('/profile') && (
          <div style={{ maxWidth: '1180px', margin: '0 auto', paddingBottom: '60px' }}>
            {/* 1. BREADCRUMB */}
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ cursor: 'pointer', color: 'var(--text-color)' }} onClick={() => navigate('/')}>Trang Chủ</span>
              <span>/</span>
              <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>Hồ Sơ Cá Nhân & Độc Giả</span>
            </div>

            {/* 2. PROFILE HERO BANNER CARD */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                padding: '32px',
                marginBottom: '32px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => avatarFileInputRef.current?.click()} title="Bấm để tải ảnh đại diện từ máy tính">
                  <img
                    src={profileAvatar}
                    alt="User Avatar"
                    style={{
                      width: '96px',
                      height: '96px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '4px solid var(--accent-pink)',
                      boxShadow: '0 8px 24px rgba(236, 72, 153, 0.3)'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '96px',
                      height: '96px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      opacity: 0.85
                    }}
                  >
                    📷
                  </div>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      backgroundColor: '#22c55e',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid var(--bg-card)',
                      zIndex: 2
                    }}
                    title="Online"
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {profileDisplayName || 'Kuro22'}
                    </h2>
                    <span
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        borderRadius: '20px',
                        backgroundColor: userRole === 'ADMIN' ? '#be185d' : 'var(--accent-pink)',
                        color: '#ffffff',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {userRole === 'ADMIN' ? '👑 SYSTEM ADMIN' : '⭐ ĐỘC GIẢ THÂN THIẾT'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ✉️ {profileEmail || 'kuro22@mangacloud.com'} • 📅 Thành viên từ Tháng 8/2026
                  </div>
                </div>
              </div>

              {/* QUICK STATS CARDS */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-pink)' }}>{bookmarkedStories.length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>❤️ Theo dõi</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#f97316' }}>{readingHistory.length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>📖 Đã đọc</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7' }}>4</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>🏆 Huy hiệu</div>
                </div>
              </div>
            </div>

            {/* 3. PROFILE TABS SWITCHER */}
            <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '14px',
                  border: profileTab === 'info' ? 'none' : '1px solid var(--border-color)',
                  backgroundColor: profileTab === 'info' ? 'var(--accent-pink)' : 'var(--bg-card)',
                  color: profileTab === 'info' ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: profileTab === 'info' ? '0 4px 14px rgba(236, 72, 153, 0.3)' : 'none'
                }}
                onClick={() => setProfileTab('info')}
              >
                👤 Thông Tin Cá Nhân
              </button>

              <button
                type="button"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '14px',
                  border: profileTab === 'bookmarks' ? 'none' : '1px solid var(--border-color)',
                  backgroundColor: profileTab === 'bookmarks' ? 'var(--accent-pink)' : 'var(--bg-card)',
                  color: profileTab === 'bookmarks' ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: profileTab === 'bookmarks' ? '0 4px 14px rgba(236, 72, 153, 0.3)' : 'none'
                }}
                onClick={() => setProfileTab('bookmarks')}
              >
                ❤️ Truyện Đã Theo Dõi ({bookmarkedStories.length})
              </button>

              <button
                type="button"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '14px',
                  border: profileTab === 'history' ? 'none' : '1px solid var(--border-color)',
                  backgroundColor: profileTab === 'history' ? 'var(--accent-pink)' : 'var(--bg-card)',
                  color: profileTab === 'history' ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: profileTab === 'history' ? '0 4px 14px rgba(236, 72, 153, 0.3)' : 'none'
                }}
                onClick={() => setProfileTab('history')}
              >
                🕒 Lịch Sử Đọc ({readingHistory.length})
              </button>

              <button
                type="button"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '14px',
                  border: profileTab === 'badges' ? 'none' : '1px solid var(--border-color)',
                  backgroundColor: profileTab === 'badges' ? 'var(--accent-pink)' : 'var(--bg-card)',
                  color: profileTab === 'badges' ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: profileTab === 'badges' ? '0 4px 14px rgba(236, 72, 153, 0.3)' : 'none'
                }}
                onClick={() => setProfileTab('badges')}
              >
                🏆 Huy Hiệu Độc Giả
              </button>
            </div>

            {/* TAB 1: PROFILE INFO & EDIT */}
            {profileTab === 'info' && (
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '32px', maxWidth: '640px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>
                  ⚙️ Cập Nhật Thông Tin Cá Nhân
                </h3>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (user) {
                      const updated = { ...user, username: profileDisplayName, email: profileEmail, avatar: profileAvatar };
                      setUser(updated);
                      localStorage.setItem('user', JSON.stringify(updated));
                    }
                    showToast('🎉 Đã cập nhật thông tin tài khoản thành công!');
                  }}
                >
                  {/* AVATAR FILE UPLOAD & PRESET SELECTION */}
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarFileUpload}
                  />

                  <div style={{ marginBottom: '24px', backgroundColor: 'var(--bg-body)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>
                      🖼️ Ảnh Đại Diện (Avatar Cá Nhân)
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <img
                        src={profileAvatar}
                        alt="Avatar Preview"
                        style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-pink)', boxShadow: '0 4px 12px rgba(236,72,153,0.2)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700 }}
                          onClick={() => avatarFileInputRef.current?.click()}
                        >
                          📁 Tải Ảnh Từ Máy Tính (Upload)
                        </button>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hỗ trợ JPG, PNG, WEBP, GIF (Tối đa 8MB)</span>
                      </div>
                    </div>

                    {/* PRESET AVATARS */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Hoặc chọn nhanh Avatar có sẵn:</div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {PRESET_AVATARS.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Preset ${idx + 1}`}
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              cursor: 'pointer',
                              border: profileAvatar === url ? '3px solid var(--accent-pink)' : '2px solid transparent',
                              transform: profileAvatar === url ? 'scale(1.1)' : 'scale(1)',
                              transition: 'all 0.15s ease'
                            }}
                            onClick={() => {
                              setProfileAvatar(url);
                              localStorage.setItem('mangacloud_avatar', url);
                              if (user) {
                                const updated = { ...user, avatar: url };
                                setUser(updated);
                                localStorage.setItem('user', JSON.stringify(updated));
                              }
                              showToast('🎨 Đã chọn Avatar mới!');
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* PASTE URL */}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Hoặc dán Đường Dẫn Ảnh (URL):</div>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="https://..."
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        value={profileAvatar.startsWith('data:') ? '' : profileAvatar}
                        onChange={(e) => {
                          setProfileAvatar(e.target.value);
                          localStorage.setItem('mangacloud_avatar', e.target.value);
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                      Tên hiển thị (Display Name)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={profileDisplayName}
                      onChange={(e) => setProfileDisplayName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                      Địa chỉ Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                      Mật khẩu mới (Bỏ trống nếu không đổi)
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Nhập mật khẩu mới..."
                      value={profileNewPassword}
                      onChange={(e) => setProfileNewPassword(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn-primary" style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '12px' }}>
                    💾 Lưu Thay Đổi
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: FOLLOWED MANGA */}
            {profileTab === 'bookmarks' && (
              <div>
                {bookmarkedStories.length === 0 ? (
                  <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>❤️</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Bạn chưa theo dõi bộ truyện nào!
                    </div>
                    <p style={{ fontSize: '13px', marginTop: '6px' }}>Bấm vào biểu tượng trái tim ❤️ ở thẻ truyện để lưu vào bộ sưu tập cá nhân.</p>
                    <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/catalog')}>
                      🔍 Khám Phá Truyện Ngay
                    </button>
                  </div>
                ) : (
                  <div className="manga-grid-6">
                    {bookmarkedStories.map((story, idx) => (
                      <div key={story.id || story.slug || idx} className="manga-card" onClick={() => navigate(`/story/${story.slug}`)}>
                        <div className="manga-cover-wrapper">
                          <button
                            className="bookmark-btn active"
                            title="Bỏ theo dõi"
                            onClick={(e) => toggleBookmark(story, story.name, e)}
                          >
                            ❤️
                          </button>
                          <img
                            src={sanitizeThumbUrl(story.thumbUrl)}
                            alt={story.name}
                            className="manga-cover-img"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                          />
                        </div>
                        <div className="manga-card-info">
                          <div className="manga-card-title">{story.name}</div>
                          <div className="manga-card-meta">
                            <span className="manga-chapter-text">{story.latestChapter || 'Ch. 1'}</span>
                            <span className="manga-author-text">👤 {story.author || 'MangaCloud'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: READING HISTORY */}
            {profileTab === 'history' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Đã xem <strong style={{ color: 'var(--accent-pink)' }}>{readingHistory.length}</strong> chapter gần nhất
                  </div>
                  {readingHistory.length > 0 && (
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '14px', color: '#ef4444' }}
                      onClick={() => {
                        setReadingHistory([]);
                        localStorage.removeItem('mangacloud_history');
                        showToast('🗑️ Đã xóa sạch lịch sử đọc truyện!');
                      }}
                    >
                      🗑️ Xóa Lịch Sử
                    </button>
                  )}
                </div>

                {readingHistory.length === 0 ? (
                  <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🕒</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Lịch sử đọc truyện trống!
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const totalHistoryPages = Math.ceil(readingHistory.length / HISTORY_PER_PAGE) || 1;
                      const currentHistoryPage = Math.min(historyCurrentPage, totalHistoryPages);
                      const paginatedHistory = readingHistory.slice((currentHistoryPage - 1) * HISTORY_PER_PAGE, currentHistoryPage * HISTORY_PER_PAGE);

                      return (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {paginatedHistory.map((item, idx) => {
                              const matchedStory = stories.find(s =>
                                s.slug === item.storySlug ||
                                s.id === item.storySlug ||
                                s.name?.toLowerCase() === item.storyName?.toLowerCase()
                              );
                              const coverSrc = matchedStory ? sanitizeThumbUrl(matchedStory.thumbUrl) : sanitizeThumbUrl(item.thumbUrl);

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '16px',
                                    padding: '14px',
                                    display: 'flex',
                                    gap: '14px',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-sm)',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onClick={() => navigate(`/read/${item.storySlug}/${item.chapterNum}`)}
                                >
                                  <img
                                    src={coverSrc}
                                    alt={item.storyName}
                                    style={{ width: '56px', height: '76px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                                  />
                                  <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {matchedStory?.name || item.storyName}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--accent-pink)', fontWeight: 600, marginTop: '2px' }}>
                                      Chương {item.chapterNum}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                      🕒 {formatRelativeTime(item.readAt, idx)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* PAGINATION BAR 1-2-3 FOR READING HISTORY */}
                          {totalHistoryPages > 1 && (
                            <div className="catalog-pagination" style={{ marginTop: '28px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                              <button
                                className="page-btn"
                                disabled={currentHistoryPage === 1}
                                onClick={() => setHistoryCurrentPage(prev => Math.max(1, prev - 1))}
                              >
                                ‹
                              </button>
                              {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map((pNum) => (
                                <button
                                  key={pNum}
                                  className={`page-btn ${pNum === currentHistoryPage ? 'active' : ''}`}
                                  onClick={() => setHistoryCurrentPage(pNum)}
                                >
                                  {pNum}
                                </button>
                              ))}
                              <button
                                className="page-btn"
                                disabled={currentHistoryPage === totalHistoryPages}
                                onClick={() => setHistoryCurrentPage(prev => Math.min(totalHistoryPages, prev + 1))}
                              >
                                ›
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* TAB 4: BADGES & REWARDS */}
            {profileTab === 'badges' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🌙</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Cày Truyện Đêm Khuya</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Đọc trên 20 chapter sau 12h đêm</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>💖</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Fan Cứng MangaCloud</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Lưu trên 10 bộ truyện vào Theo Dõi</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚡</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Thần Đọc Chapter</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Cày trên 100 chapter manga</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>👑</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>Độc Giả Kỳ Cựu</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Đồng hành cùng MangaCloud 2026</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROUTE 2: MANGA DETAIL VIEW ('/story/:slug') */}
        {routePath.startsWith('/story/') && !selectedStory && (
          <div className="heart-loader-container" style={{ padding: '80px 0' }}>
            <span className="pink-heart-icon">🩷</span>
            <span className="heart-loader-text">Đang tải thông tin bộ truyện MangaCloud...</span>
          </div>
        )}

        {routePath.startsWith('/story/') && selectedStory && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
            {/* 1. BREADCRUMB NAVIGATION */}
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ cursor: 'pointer', color: 'var(--text-color)' }} onClick={() => navigate('/')}>Trang Chủ</span>
              <span>/</span>
              <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>{selectedStory.name}</span>
            </div>

            {/* 2. TOP HERO CARD (2 COLUMNS) */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '28px',
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              gap: '28px',
              boxShadow: 'var(--shadow-md)',
              marginBottom: '28px'
            }}>
              {/* Left Poster Cover Column */}
              <div>
                <img
                  src={sanitizeThumbUrl(selectedStory.thumbUrl)}
                  alt={selectedStory.name}
                  style={{
                    width: '220px',
                    height: '310px',
                    objectFit: 'cover',
                    borderRadius: '14px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border-color)'
                  }}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                />
              </div>

              {/* Right Details Column */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', lineHeight: 1.2 }}>
                    {selectedStory.name}
                  </h1>

                  {/* Metadata Grid (2 Columns) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px 24px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginBottom: '18px'
                  }}>
                    <div>📌 <strong>Tên khác:</strong> {Array.isArray(selectedStory.originName) ? selectedStory.originName.join('; ') : (typeof selectedStory.originName === 'string' ? selectedStory.originName : selectedStory.name)}</div>
                    <div>👤 <strong>Tác giả:</strong> <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>{selectedStory.author && selectedStory.author !== 'MangaCloud' ? selectedStory.author : 'Đang cập nhật'}</span></div>
                    <div>📅 <strong>Ngày tạo:</strong> {selectedStory.createdAt ? new Date(selectedStory.createdAt).toLocaleDateString('vi-VN') : '12/08/2021'}</div>
                    <div>👥 <strong>Nhóm dịch:</strong> Pandora</div>
                    <div>📑 <strong>Tổng số chap:</strong> <strong style={{ color: 'var(--accent-pink)' }}>{storyChaptersList.length || selectedStory.totalChapters || 0}</strong></div>
                    <div>📡 <strong>Tình trạng:</strong> {selectedStory.status === 'Completed' ? 'Hoàn thành' : selectedStory.status === 'Upcoming' ? 'Sắp ra mắt' : 'Đang ra'}</div>
                    <div>👍 <strong>Lượt thích:</strong> 10,393</div>
                    <div>❤️ <strong>Lượt theo dõi:</strong> {((selectedStory.viewCount || 100000) * 0.15).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</div>
                    <div style={{ gridColumn: 'span 2' }}>
                      👁️ <strong>Lượt xem:</strong> <strong style={{ color: '#059669' }}>{selectedStory.viewCount ? selectedStory.viewCount.toLocaleString() : '48,609,172'}</strong>
                    </div>
                  </div>

                  {/* Categories Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {(Array.isArray(selectedStory.categories) ? selectedStory.categories : ['Action', 'Adventure', 'Fantasy', 'Shounen']).map((cat) => (
                      <span
                        key={cat}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #f97316',
                          color: '#ea580c',
                          backgroundColor: 'rgba(249, 115, 22, 0.05)'
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: '#22c55e', padding: '10px 20px', fontSize: '13px', fontWeight: 700 }}
                    onClick={() => navigate(`/read/${selectedStory.slug}/1`)}
                  >
                    📗 Đọc từ đầu
                  </button>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: isStoryBookmarked(selectedStory) ? '#ec4899' : '#f43f5e', padding: '10px 20px', fontSize: '13px', fontWeight: 700 }}
                    onClick={(e) => toggleBookmark(selectedStory, selectedStory?.name, e)}
                  >
                    {isStoryBookmarked(selectedStory) ? '❤️ Đã theo dõi' : '❤️ Theo dõi'}
                  </button>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ backgroundColor: '#a855f7', padding: '10px 20px', fontSize: '13px', fontWeight: 700 }}
                    onClick={() => showToast('👍 Cảm ơn bạn đã thích bộ truyện này!')}
                  >
                    👍 Thích
                  </button>
                </div>
              </div>
            </div>

            {/* 3. RICH GIỚI THIỆU SECTION MATCHING EXACT SCREENSHOT */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '28px',
              marginBottom: '28px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                ℹ️ Giới Thiệu
              </h3>

              {/* Sub-heading 1: Thông tin cơ bản */}
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ea580c', marginBottom: '12px' }}>
                Thông tin cơ bản của {selectedStory.name}
              </h4>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '24px' }}>
                {selectedStory.originName && selectedStory.originName.length > 0 && (
                  <div><strong>Tên gốc / Tên tiếng Anh:</strong> {selectedStory.originName.join('; ')}</div>
                )}
                <div><strong>Tác giả nguyên tác:</strong> <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>{selectedStory.author && selectedStory.author !== 'MangaCloud' ? selectedStory.author : 'Đang cập nhật'}</span></div>
                <div><strong>Thể loại:</strong> {selectedStory.categories ? selectedStory.categories.join(', ') : 'Hành động, Giả tưởng, Shounen, Manhwa'}</div>
                <div><strong>Trạng thái:</strong> {selectedStory.status === 'Completed' ? 'Hoàn thành' : 'Đang ra'}</div>
              </div>

              {/* Sub-heading 2: Hành trình cốt truyện */}
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ea580c', marginBottom: '12px' }}>
                Hành trình cốt truyện của {selectedStory.name}
              </h4>
              <div
                style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '24px' }}
                dangerouslySetInnerHTML={{
                  __html: selectedStory.summary ? selectedStory.summary.replace(/<p>/g, '<p style="margin-bottom: 12px;">') : `<p>Bộ truyện <strong>${selectedStory.name}</strong> thuộc thể loại <em>${selectedStory.categories?.join(', ') || 'Truyện Tranh'}</em> được chấp bút bởi tác giả <strong>${selectedStory.author && selectedStory.author !== 'MangaCloud' ? selectedStory.author : 'Đang cập nhật'}</strong>.</p><p>Hành trình lôi cuốn và kịch tính mang tới trải nghiệm vô cùng cuốn hút cho độc giả ngay từ những chương đầu tiên!</p>`
                }}
              />

              {/* Sub-heading 3: Điều gì làm nên sức hút */}
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#ea580c', marginBottom: '12px' }}>
                Điều gì làm nên sức hút của {selectedStory.name}?
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, margin: 0 }}>
                <strong>{selectedStory.name}</strong> là một trong những tác phẩm nổi bật nhất thuộc nhóm thể loại <strong>{selectedStory.categories ? selectedStory.categories.join(', ') : 'Action, Adventure'}</strong>, được sáng tác bởi <strong>{selectedStory.author && selectedStory.author !== 'MangaCloud' ? selectedStory.author : 'tác giả nguyên tác'}</strong> và mang đến cho độc giả Việt Nam thông qua bản dịch của nhóm dịch <strong>Pandora</strong>. Bộ truyện gây ấn tượng nhờ cách kể chuyện chặt chẽ, diễn biến hợp lý và dàn nhân vật được xây dựng có chiều sâu, tạo nên sức hút bền bỉ theo từng chương.
                Kể từ khi ra mắt, <strong>{selectedStory.name}</strong> đã ghi nhận hơn <strong style={{ color: '#059669' }}>{selectedStory.viewCount ? selectedStory.viewCount.toLocaleString() : '48,609,172'}</strong> lượt xem và trở thành lựa chọn quen thuộc của cộng đồng yêu thích thể loại này tại MangaCloud.
              </p>
            </div>

            {/* 4. DANH SÁCH CHƯƠNG SECTION */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  📚 Danh Sách Chương ({storyChaptersList.length || selectedStory.totalChapters || 0})
                </h3>

                <input
                  type="text"
                  placeholder="🔍 Tìm nhanh số chương..."
                  className="form-control"
                  style={{ width: '220px', padding: '6px 12px', fontSize: '13px' }}
                  value={storyDetailSearchQuery}
                  onChange={(e) => setStoryDetailSearchQuery(e.target.value)}
                />
              </div>

              {/* Scrollable Chapters Table List (Latest Chapters on top) */}
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '12px'
              }}>
                <table className="admin-data-table" style={{ width: '100%' }}>
                  <tbody>
                    {(() => {
                      let chaptersList = (storyChaptersList && storyChaptersList.length > 0)
                        ? storyChaptersList
                        : [];

                      if (chaptersList.length === 0 && selectedStory) {
                        const total = selectedStory.totalChapters || (selectedStory.latestChapter ? parseInt(String(selectedStory.latestChapter).replace(/\D/g, ''), 10) : 0) || 0;
                        if (total > 0) {
                          chaptersList = Array.from({ length: total }, (_, i) => ({
                            id: `ch-${selectedStory.slug}-${i + 1}`,
                            storySlug: selectedStory.slug,
                            chapterName: String(i + 1),
                            chapterNumber: String(i + 1),
                            chapterTitle: `Chương ${i + 1}`
                          }));
                        }
                      }

                      const seen = new Set();
                      const unique = chaptersList.filter(c => {
                        const cNum = String(c.chapterName || c.chapterNumber || '');
                        if (!cNum || seen.has(cNum)) return false;
                        seen.add(cNum);
                        return true;
                      });

                      if (unique.length === 0) {
                        return (
                          <tr>
                            <td colSpan={2} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                              Chưa có chương nào được xuất bản cho bộ truyện này.
                            </td>
                          </tr>
                        );
                      }

                      unique.sort((a, b) => parseFloat(a.chapterName || a.chapterNumber || 0) - parseFloat(b.chapterName || b.chapterNumber || 0));

                      return unique
                        .filter(ch => {
                          if (!storyDetailSearchQuery.trim()) return true;
                          const q = storyDetailSearchQuery.trim().toLowerCase();
                          const cNum = String(ch.chapterName || ch.chapterNumber || '');
                          const cTitle = String(ch.chapterTitle || ch.title || '').toLowerCase();
                          return cNum.includes(q) || cTitle.includes(q);
                        })
                        .slice()
                        .reverse()
                        .map((ch, idx) => {
                          const cNum = ch.chapterName || ch.chapterNumber || '1';
                          const cTitle = ch.chapterTitle || ch.title || `Chương ${cNum}`;
                          const formattedDate = formatSmartChapterTime(ch.updatedAt, idx);
                          return (
                            <tr
                              key={ch.id || cNum}
                              style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                              onClick={() => navigate(`/read/${selectedStory.slug}/${cNum}`)}
                            >
                              <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-color)' }}>
                                {cTitle.startsWith('Chương') || cTitle.startsWith('Chapter') ? cTitle : `Chương ${cNum}: ${cTitle}`}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                                {formattedDate}
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. DANH SÁCH BÌNH LUẬN TRUYỆN SECTION (Dưới danh sách chương) */}
            <div style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)',
              marginTop: '24px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                💬 Bình Luận Về Bộ Truyện ({storyComments.length})
              </h3>

              {userRole === 'GUEST' || !user ? (
                <div style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '14px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>🔒</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Bạn cần <strong>đăng nhập</strong> tài khoản để có quyền gửi bình luận.
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <button type="button" className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '8px' }} onClick={() => openAuth('login')}>
                      🔑 Đăng Nhập
                    </button>
                    <button type="button" className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '8px', backgroundColor: '#ec4899' }} onClick={() => openAuth('register')}>
                      👤 Đăng Ký
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePostStoryComment} className="comment-input-form" style={{ marginBottom: '24px' }}>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder={`Chia sẻ cảm nghĩ của bạn về bộ truyện ${selectedStory.name}... (Nhấn Enter để gửi)`}
                    value={newStoryCommentInput}
                    onChange={(e) => setNewStoryCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handlePostStoryComment(e);
                      }
                    }}
                    disabled={storyCommentSubmitting}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>💡 Nhấn Enter để gửi, Shift + Enter để xuống dòng</span>
                    <button type="submit" className="btn-primary" disabled={storyCommentSubmitting || !newStoryCommentInput.trim()}>
                      {storyCommentSubmitting ? 'Đang gửi...' : '💬 Gửi Bình Luận'}
                    </button>
                  </div>
                </form>
              )}

              {/* COMMENTS LIST FOR STORY DETAIL PAGE */}
              {(() => {
                const COMMENTS_PER_PAGE = 10;
                const totalPages = Math.ceil(storyComments.length / COMMENTS_PER_PAGE) || 1;
                const currentPage = Math.min(storyCommentPage, totalPages);
                const paginated = storyComments.slice((currentPage - 1) * COMMENTS_PER_PAGE, currentPage * COMMENTS_PER_PAGE);

                return (
                  <>
                    <div className="comments-list">
                      {storyComments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                          Chưa có bình luận nào cho bộ truyện này. Hãy là người đầu tiên bình luận!
                        </div>
                      ) : (
                        paginated.map((c, idx) => (
                          <div key={c.id || idx} className="comment-card" style={{ display: 'flex', gap: '12px', padding: '14px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                            <img
                              src={c.userAvatar || c.avatar || profileAvatar || DEFAULT_USER_AVATAR}
                              alt="Avatar"
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-pink)', flexShrink: 0 }}
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_USER_AVATAR; }}
                            />
                            <div style={{ flex: 1 }}>
                              <div className="comment-author-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{c.userName || c.username || 'Thành Viên'}</strong>
                                  {c.chapterName && c.chapterName !== 'General' && (
                                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent-pink)', fontWeight: 700 }}>
                                      {c.chapterName.startsWith('Ch') ? c.chapterName : `Ch. ${c.chapterName}`}
                                    </span>
                                  )}
                                </div>
                                <span className="comment-time" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {c.createdAt ? formatRelativeTime(c.createdAt, idx) : (c.time || 'vừa xong')}
                                </span>
                              </div>
                              <div className="comment-content-text" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {c.content}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* PAGINATION BAR */}
                    {totalPages > 1 && (
                      <div className="catalog-pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="page-btn"
                          style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                          disabled={currentPage === 1}
                          onClick={() => setStoryCommentPage(prev => Math.max(1, prev - 1))}
                        >
                          ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                          <button
                            key={pNum}
                            type="button"
                            className={`page-btn ${pNum === currentPage ? 'active' : ''}`}
                            style={{
                              padding: '4px 10px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              backgroundColor: pNum === currentPage ? 'var(--accent-pink)' : 'transparent',
                              color: pNum === currentPage ? '#fff' : 'var(--text-color)',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer'
                            }}
                            onClick={() => setStoryCommentPage(pNum)}
                          >
                            {pNum}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="page-btn"
                          style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                          disabled={currentPage === totalPages}
                          onClick={() => setStoryCommentPage(prev => Math.min(totalPages, prev + 1))}
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ROUTE 3: CHAPTER READER SCREEN ('/read/:storySlug/:chapterName') */}
        {routePath.startsWith('/read/') && (
          <div className="webtoon-reader-screen">
            {/* TOP READER BAR */}
            <header className="reader-top-bar">
              <div className="reader-bar-left">
                <button className="btn-secondary" onClick={() => navigate(selectedStory ? `/story/${selectedStory.slug}` : '/')}>
                  ⬅️ Quay Lại
                </button>
                <div className="reader-story-title">
                  <strong>{selectedStory?.name || 'Manga'}</strong> - Chapter {selectedChapter || '1'}
                </div>
              </div>

              <div className="reader-bar-right">
                {/* QUICK CHAPTER SELECT DROPDOWN */}
                <select
                  className="chapter-select-dropdown"
                  value={selectedChapter || '1'}
                  onChange={(e) => {
                    const slug = routePath.replace('/read/', '').split('/')[0];
                    navigate(`/read/${slug}/${e.target.value}`);
                  }}
                >
                  {(() => {
                    const seen = new Set();
                    const uniqueList = (storyChaptersList || []).filter(ch => {
                      const cNum = String(ch.chapterName || ch.chapterNumber || '');
                      if (!cNum || seen.has(cNum)) return false;
                      seen.add(cNum);
                      return true;
                    });

                    return uniqueList.map((ch) => {
                      const cNum = ch.chapterName || ch.chapterNumber || '1';
                      const cTitle = ch.chapterTitle || ch.title || `Chapter ${cNum}`;
                      return (
                        <option key={ch.id || cNum} value={cNum}>
                          {cTitle.startsWith('Chapter') || cTitle.startsWith('Ch.') ? cTitle : `Chapter ${cNum}: ${cTitle}`}
                        </option>
                      );
                    });
                  })()}
                </select>

                <button
                  className="btn-secondary"
                  disabled={Number(selectedChapter || 1) <= 1}
                  onClick={() => {
                    const slug = routePath.replace('/read/', '').split('/')[0];
                    navigate(`/read/${slug}/${Math.max(1, Number(selectedChapter || 1) - 1)}`);
                  }}
                >
                  ‹ Tập Trước
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    const slug = routePath.replace('/read/', '').split('/')[0];
                    navigate(`/read/${slug}/${Number(selectedChapter || 1) + 1}`);
                  }}
                >
                  Tập Sau ›
                </button>
              </div>
            </header>

            {/* WEBTOON IMAGE CANVAS */}
            <main className="webtoon-canvas">
              {chapterLoading ? (
                <div className="heart-loader-container">
                  <span className="pink-heart-icon">🩷</span>
                  <span className="heart-loader-text">Đang tải trang ảnh Webtoon...</span>
                </div>
              ) : (
                (() => {
                  const pagesList = (chapterDetail?.imageUrls && chapterDetail.imageUrls.length > 0)
                    ? chapterDetail.imageUrls
                    : (chapterDetail?.pages && chapterDetail.pages.length > 0)
                      ? chapterDetail.pages
                      : [
                        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80'
                      ];

                  return pagesList.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`Page ${idx + 1}`}
                      className="webtoon-page-img"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_WEBTOON_PAGE; }}
                    />
                  ));
                })()
              )}
            </main>

            {/* BOTTOM NAV & LIVE COMMENTS */}
            <footer className="reader-bottom-section">
              <div className="reader-bottom-nav">
                <button
                  className="btn-secondary"
                  disabled={Number(selectedChapter || 1) <= 1}
                  onClick={() => navigate(`/read/${selectedStory?.slug || 'one-piece'}/${Number(selectedChapter || 1) - 1}`)}
                >
                  ‹ Tập Trước
                </button>
                <button
                  className="btn-secondary"
                  onClick={(e) => toggleBookmark(selectedStory, selectedStory?.name, e)}
                >
                  {isStoryBookmarked(selectedStory) ? '❤️ Đã Theo Dõi' : '🤍 Theo Dõi Truyện'}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/read/${selectedStory?.slug || 'one-piece'}/${Number(selectedChapter || 1) + 1}`)}
                >
                  Tập Sau ›
                </button>
              </div>

              {/* LIVE COMMENT SECTION */}
              <div className="comments-section-container">
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  💬 Bình Luận Độc Giả ({chapterComments.length})
                </h3>

                {userRole === 'GUEST' || !user ? (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '14px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '20px'
                  }}>
                    <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>🔒</span>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Bạn cần <strong>đăng nhập</strong> tài khoản để có quyền gửi bình luận.
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <button type="button" className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '8px' }} onClick={() => openAuth('login')}>
                        🔑 Đăng Nhập
                      </button>
                      <button type="button" className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '8px', backgroundColor: '#ec4899' }} onClick={() => openAuth('register')}>
                        👤 Đăng Ký
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePostComment} className="comment-input-form">
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Viết bình luận của bạn về chapter này... (Nhấn Enter để gửi)"
                      value={newCommentInput}
                      onChange={(e) => setNewCommentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment(e);
                        }
                      }}
                      disabled={commentSubmitting}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>💡 Nhấn Enter để gửi, Shift + Enter để xuống dòng</span>
                      <button type="submit" className="btn-primary" disabled={commentSubmitting || !newCommentInput.trim()}>
                        {commentSubmitting ? 'Đang gửi...' : '💬 Gửi Bình Luận'}
                      </button>
                    </div>
                  </form>
                )}

                {(() => {
                  const COMMENTS_PER_PAGE = 10;
                  const totalCommentPages = Math.ceil(chapterComments.length / COMMENTS_PER_PAGE) || 1;
                  const currentCommentPage = Math.min(commentPage, totalCommentPages);
                  const paginatedComments = chapterComments.slice((currentCommentPage - 1) * COMMENTS_PER_PAGE, currentCommentPage * COMMENTS_PER_PAGE);

                  return (
                    <>
                      <div className="comments-list" style={{ marginTop: '20px' }}>
                        {chapterComments.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Chưa có bình luận nào cho Chapter này. Hãy là người đầu tiên bình luận!
                          </div>
                        ) : (
                          paginatedComments.map((c, idx) => (
                            <div key={c.id || idx} className="comment-card" style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: '10px' }}>
                              <img
                                src={c.userAvatar || c.avatar || profileAvatar || DEFAULT_USER_AVATAR}
                                alt="Avatar"
                                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-pink)', flexShrink: 0 }}
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_USER_AVATAR; }}
                              />
                              <div style={{ flex: 1 }}>
                                <div className="comment-author-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c.userName || c.username || 'Thành Viên'}</strong>
                                  <span className="comment-time" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.createdAt ? formatRelativeTime(c.createdAt, idx) : (c.time || 'vừa xong')}</span>
                                </div>
                                <div className="comment-content-text" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{c.content}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* COMMENT PAGINATION BAR 1-2-3 */}
                      {totalCommentPages > 1 && (
                        <div className="catalog-pagination" style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="page-btn"
                            style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                            disabled={currentCommentPage === 1}
                            onClick={() => setCommentPage(prev => Math.max(1, prev - 1))}
                          >
                            ‹
                          </button>
                          {Array.from({ length: totalCommentPages }, (_, i) => i + 1).map((pNum) => (
                            <button
                              key={pNum}
                              type="button"
                              className={`page-btn ${pNum === currentCommentPage ? 'active' : ''}`}
                              style={{
                                padding: '4px 10px',
                                fontSize: '12px',
                                borderRadius: '6px',
                                backgroundColor: pNum === currentCommentPage ? 'var(--accent-pink)' : 'transparent',
                                color: pNum === currentCommentPage ? '#fff' : 'var(--text-color)',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                              }}
                              onClick={() => setCommentPage(pNum)}
                            >
                              {pNum}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="page-btn"
                            style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                            disabled={currentCommentPage === totalCommentPages}
                            onClick={() => setCommentPage(prev => Math.min(totalCommentPages, prev + 1))}
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* 4. SITE FOOTER */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div>
              <div className="header-brand" onClick={() => navigate('/')} style={{ marginBottom: '12px' }}>
                <img src="/logo.png" alt="MangaCloud" className="brand-logo-img" style={{ height: '36px' }} />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '320px' }}>
                MangaCloud - Ổ Truyện Soft Pink Theme. Nền tảng đọc truyện tranh vietsub bản quyền cao cấp nhẹ nhàng dịu mắt.
              </p>
            </div>

            <div>
              <div className="footer-col-title">Điều Hướng</div>
              <ul className="footer-links-list">
                <li><a href="/" className="footer-link" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Truyện mới</a></li>
                <li><a href="#categories" className="footer-link">Thể loại</a></li>
                <li><a href="#rankings" className="footer-link">Truyện Hot</a></li>
                <li><a href="#new" className="footer-link">Truyện Full</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Thể Loại Hot</div>
              <ul className="footer-links-list">
                <li><a href="#romance" className="footer-link">Romance</a></li>
                <li><a href="#fantasy" className="footer-link">Fantasy</a></li>
                <li><a href="#drama" className="footer-link">Drama</a></li>
                <li><a href="#manhwa" className="footer-link">Manhwa</a></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Cộng Đồng & Hỗ Trợ</div>
              <ul className="footer-links-list">
                <li><a href="https://discord.com" target="_blank" rel="noreferrer" className="footer-link">Discord Server</a></li>
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="footer-link">GitHub Repository</a></li>
                <li><a href="#terms" className="footer-link">Điều khoản dịch vụ</a></li>
                <li><a href="#privacy" className="footer-link">Chính sách bảo mật</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            © 2026 MangaCloud. Premium Manga & Comic Reader. All rights reserved.
          </div>
        </div>
      </footer>

      {/* FLOATING SCROLL TO TOP BUTTON (BACK TO TOP) MATCHING USER REQUEST */}
      {showScrollTop && (
        <button
          type="button"
          className="scroll-to-top-btn"
          onClick={scrollToTop}
          title="Cuộn lên đầu trang"
          aria-label="Cuộn lên đầu trang"
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
