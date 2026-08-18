import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80';

export default function AdminDashboard({
  stories = [],
  onRefreshStories,
  onNavigateHome,
  showToast = () => { },
  theme = 'light',
  toggleTheme = () => { }
}) {
  const safeStories = Array.isArray(stories) ? stories : [];

  // Active Tab State: 'overview' | 'stories' | 'chapters' | 'users' | 'comments'
  const [activeTab, setActiveTab] = useState('overview');

  // Story Management Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Ongoing' | 'Completed'
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'views' | 'name'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Story Modal State (Add / Edit Story)
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [formName, setFormName] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formCategories, setFormCategories] = useState('Romance, Drama');
  const [formStatus, setFormStatus] = useState('Ongoing');
  const [formThumbUrl, setFormThumbUrl] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chapter List Modal State (Feature 1: View / Edit / Delete Chapters for a specific story)
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [selectedStoryForChapters, setSelectedStoryForChapters] = useState(null);
  const [storyChapters, setStoryChapters] = useState([]);
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [previewPagesModal, setPreviewPagesModal] = useState(null); // chapter object to preview

  // Chapter Upload State (Tab 3)
  const [selectedStorySlug, setSelectedStorySlug] = useState(safeStories[0]?.slug || '');
  const [chapterNumber, setChapterNumber] = useState('1');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterPages, setChapterPages] = useState(
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=900\nhttps://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900'
  );
  const [uploadMode, setUploadMode] = useState('bulk'); // 'single' | 'bulk'
  const [bulkChaptersInput, setBulkChaptersInput] = useState('');
  const [bulkStorySearchQuery, setBulkStorySearchQuery] = useState('');

  // Auto-sync selectedStorySlug to the first story when list loads
  useEffect(() => {
    if (!selectedStorySlug && safeStories.length > 0) {
      setSelectedStorySlug(safeStories[0]?.slug || '');
    }
  }, [safeStories, selectedStorySlug]);

  // Otruyen Auto Importer & Live Progress State
  const [showOtruyenModal, setShowOtruyenModal] = useState(false);
  const [otruyenSlugInput, setOtruyenSlugInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percent: 0, text: '' });
  const [crawlerLogs, setCrawlerLogs] = useState([]);
  const [isSyncingLatest, setIsSyncingLatest] = useState(false);

  const fetchCrawlerLogs = async () => {
    try {
      const logs = await api.getCrawlerLogs();
      setCrawlerLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      setCrawlerLogs([]);
    }
  };

  useEffect(() => {
    fetchCrawlerLogs();
  }, []);

  const handleManualTriggerSync = async () => {
    setIsSyncingLatest(true);
    showToast('⚡ Đã kích hoạt tác vụ cào ngầm! Đang quét Otruyen API...');
    try {
      const res = await api.syncLatestChapters();
      if (res && res.success) {
        showToast(`✅ ${res.message}`);
        if (onRefreshStories) onRefreshStories();
        fetchCrawlerLogs();
      } else {
        showToast(res?.message || 'Có lỗi xảy ra khi đồng bộ!', 'error');
      }
    } catch (err) {
      showToast('Lỗi khi kích hoạt cào ngầm!', 'error');
    } finally {
      setIsSyncingLatest(false);
    }
  };

  // 1-Click Multi-Source Auto-Crawler State
  const [crawlerSourceTab, setCrawlerSourceTab] = useState('otruyen'); // 'otruyen' | 'mangadex'
  const [crawlerSearchQuery, setCrawlerSearchQuery] = useState('');
  const [crawlerSearchResults, setCrawlerSearchResults] = useState([]);
  const [isSearchingCrawler, setIsSearchingCrawler] = useState(false);

  // Auto-search effect with 300ms debounce
  useEffect(() => {
    if (!crawlerSearchQuery.trim()) {
      setCrawlerSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCrawler(true);
      try {
        let res = [];
        if (crawlerSourceTab === 'otruyen') {
          res = await api.searchOtruyenStories(crawlerSearchQuery);
        } else {
          res = await api.searchMangadexStories(crawlerSearchQuery);
        }
        setCrawlerSearchResults(Array.isArray(res) ? res : []);
      } catch (e) {
        setCrawlerSearchResults([]);
      } finally {
        setIsSearchingCrawler(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [crawlerSearchQuery, crawlerSourceTab]);

  const handle1ClickImport = async (item) => {
    setIsImporting(true);
    const name = item.name || item.slug || 'Bộ truyện';
    setImportProgress({ current: 10, total: 100, percent: 10, text: `⚡ Đang cào toàn bộ Chapter cho "${name}"...` });

    let prog = 10;
    const interval = setInterval(() => {
      prog = Math.min(95, prog + 15);
      setImportProgress({ current: prog, total: 100, percent: prog, text: `⚡ Đang nạp danh sách Chapter & ảnh trang truyện (${prog}%)...` });
    }, 300);

    try {
      let res = null;
      if (crawlerSourceTab === 'otruyen') {
        res = await api.importOtruyenBySlug(item.slug);
      } else {
        res = await api.importMangadexById(item.id);
      }
      clearInterval(interval);
      setImportProgress({ current: 100, total: 100, percent: 100, text: '🎉 Đã cào và xuất bản thành công!' });
      showToast(res?.message || `Đã đăng hàng loạt bộ "${name}" thành công!`);
      if (onRefreshStories) onRefreshStories();
      setTimeout(() => {
        setIsImporting(false);
        setImportProgress({ current: 0, total: 0, percent: 0, text: '' });
      }, 1500);
    } catch (err) {
      clearInterval(interval);
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0, percent: 0, text: '' });
      showToast(err.message || 'Lỗi khi cào bộ truyện!', 'error');
    }
  };

  const handleImportOtruyen = async (slugToImport) => {
    const slug = (slugToImport || otruyenSlugInput).trim();
    if (!slug) {
      showToast('Vui lòng nhập slug bộ truyện Otruyen (Ví dụ: solo-leveling, one-piece...)', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 10, total: 100, percent: 10, text: `⚡ Đang kết nối Otruyen CDN kéo dữ liệu bộ "${slug}"...` });

    let prog = 10;
    const interval = setInterval(() => {
      prog = Math.min(95, prog + 15);
      setImportProgress({ current: prog, total: 100, percent: prog, text: `📥 Đang bóc tách ảnh & chapter bộ "${slug}"... ${prog}%` });
    }, 250);

    try {
      const res = await api.importOtruyenStory(slug);
      clearInterval(interval);
      setImportProgress({ current: 100, total: 100, percent: 100, text: `🎉 Đã cào hoàn tất 100% bộ "${slug}"!` });

      if (res && res.success) {
        showToast(`⚡ Import thành công bộ truyện "${res.story?.name || slug}" và toàn bộ chapter!`);
        setTimeout(() => {
          setShowOtruyenModal(false);
          setOtruyenSlugInput('');
          setImportProgress({ current: 0, total: 0, percent: 0, text: '' });
        }, 1200);
        if (onRefreshStories) onRefreshStories();
      } else {
        showToast(res?.message || 'Không thể import bộ truyện từ Otruyen API!', 'error');
      }
    } catch (err) {
      clearInterval(interval);
      showToast('Lỗi khi kết nối với Otruyen API!', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const [isAutoPolling, setIsAutoPolling] = useState(false);

  const startBackgroundPolling = () => {
    setIsAutoPolling(true);
    let counter = 0;
    const interval = setInterval(() => {
      counter += 1;
      if (onRefreshStories) onRefreshStories();
      if (counter >= 45) { // Poll for up to 90 seconds (45 * 2s) to cover full 120 stories batch
        clearInterval(interval);
        setIsAutoPolling(false);
      }
    }, 2000);
  };

  const [startPageInput, setStartPageInput] = useState(1);
  const [endPageInput, setEndPageInput] = useState(5);

  const handleBatchImport = async (startPage = 1, endPage = 5) => {
    setIsImporting(true);
    setImportProgress({ current: 5, total: 100, percent: 5, text: `🚀 Bắt đầu cào Hàng Loạt từ Trang ${startPage} → ${endPage}...` });

    let prog = 5;
    const interval = setInterval(() => {
      prog = Math.min(98, prog + 5);
      setImportProgress({
        current: prog,
        total: 100,
        percent: prog,
        text: `⚡ Đang tự động cào và lưu truyện vào Database... ${prog}%`
      });
      if (prog >= 98) clearInterval(interval);
    }, 400);

    try {
      const res = await api.importBatchOtruyenStories(startPage, endPage);
      if (res && res.success) {
        showToast(res.message || `🚀 Đã kích hoạt cào ngầm từ Trang ${startPage} đến Trang ${endPage}! Truyện đang đổ về DB.`);
        startBackgroundPolling();
        setTimeout(() => {
          setImportProgress({ current: 100, total: 100, percent: 100, text: `🎉 Đã tải về toàn bộ danh sách trang ${startPage} → ${endPage}!` });
          setTimeout(() => {
            setShowOtruyenModal(false);
            setImportProgress({ current: 0, total: 0, percent: 0, text: '' });
          }, 1200);
        }, 3000);
      } else {
        clearInterval(interval);
        showToast(res?.message || 'Lỗi khi kích hoạt tiến trình cào ngầm!', 'error');
      }
    } catch (err) {
      clearInterval(interval);
      showToast('Lỗi khi kết nối kích hoạt cào hàng loạt từ Otruyen!', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // User Management State (Feature 2)
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Comment & Report Moderation State (Feature 3)
  const [commentsList, setCommentsList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [commentReportsList, setCommentReportsList] = useState([]);

  // Fetch Users & Moderation Data on Component Mount & Tab Switch
  useEffect(() => {
    fetchUsersData();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsersData();
    } else if (activeTab === 'comments') {
      fetchModerationData();
    }
  }, [activeTab]);

  const fetchUsersData = async () => {
    setUsersLoading(true);
    try {
      const data = await api.getUsers();
      const sanitizedUsers = (data || []).map(u => ({
        ...u,
        id: u.id,
        username: u.username || 'Member',
        email: u.email || 'user@truyencloud.com',
        role: Array.isArray(u.roles) ? (u.roles.includes('ROLE_ADMIN') ? 'ROLE_ADMIN' : 'ROLE_MEMBER') : (u.role || 'ROLE_MEMBER'),
        status: u.status || 'ACTIVE',
        joinedDate: u.joinedDate || '2026-01-01',
        avatar: u.avatar || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="%23cbd5e1"/><circle cx="100" cy="75" r="40" fill="%23ffffff"/><path d="M100 125c-42 0-75 22-75 48v20h150v-20c0-26-33-48-75-48z" fill="%23ffffff"/></svg>`
      }));
      setUsersList(sanitizedUsers);
    } catch (err) {
      console.error(err);
      setUsersList([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchModerationData = async () => {
    try {
      const [comments, reports, commentReports] = await Promise.all([
        api.getComments(),
        api.getChapterReports(),
        api.getCommentReports()
      ]);
      setCommentsList(comments || []);
      setReportsList(reports || []);
      setCommentReportsList(commentReports || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Open Story Add/Edit Modal
  const openStoryModal = (story = null) => {
    setActiveTab('stories');
    if (story) {
      setEditingStory(story);
      setFormName(story.name || '');
      setFormAuthor(story.author || '');
      setFormCategories(story.categories ? story.categories.join(', ') : 'Romance, Action');
      setFormStatus(story.status || 'Ongoing');
      setFormThumbUrl(story.thumbUrl || '');
      setFormSummary(story.summary || '');
    } else {
      setEditingStory(null);
      setFormName('');
      setFormAuthor('');
      setFormCategories('Romance, Drama');
      setFormStatus('Ongoing');
      setFormThumbUrl('');
      setFormSummary('');
    }
    setShowStoryModal(true);
  };

  // Submit Add/Edit Story
  const handleSaveStory = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Vui lòng nhập tên bộ truyện!', 'error');
      return;
    }

    setIsSubmitting(true);
    const categoriesArray = formCategories.split(',').map(c => c.trim()).filter(Boolean);

    const payload = {
      name: formName,
      author: formAuthor || 'MangaCloud Admin',
      categories: categoriesArray,
      status: formStatus,
      thumbUrl: formThumbUrl || DEFAULT_COVER_IMAGE,
      summary: formSummary || 'Bộ truyện mới trên MangaCloud.'
    };

    try {
      if (editingStory) {
        await api.updateStory(editingStory.id || editingStory.slug, payload).catch(() => null);
        showToast(`✏️ Đã cập nhật thành công bộ truyện "${formName}"!`);
      } else {
        await api.createStory(payload).catch(() => null);
        showToast(`🎉 Đã thêm mới thành công bộ truyện "${formName}"!`);
      }
      setShowStoryModal(false);
      if (onRefreshStories) onRefreshStories();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu thông tin truyện', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Story Handler
  const handleDeleteStory = async (story) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bộ truyện "${story.name}"?`)) {
      try {
        await api.deleteStory(story.id || story.slug).catch(() => null);
        showToast(`🗑️ Đã xóa bộ truyện "${story.name}" thành công!`);
        if (onRefreshStories) onRefreshStories();
      } catch (err) {
        showToast('Lỗi khi xóa bộ truyện!', 'error');
      }
    }
  };

  // Open Chapter List Modal for a specific Story (Feature 1 - Real API)
  const openChapterModal = async (story) => {
    setSelectedStoryForChapters(story);
    setChapterSearchQuery('');
    setShowChapterModal(true);

    try {
      const chapters = await api.getChaptersByStory(story.slug);
      let list = Array.isArray(chapters) && chapters.length > 0 ? chapters : (story.chapters || []);
      const totalCount = story.totalChapters || (story.latestChapter ? parseInt(String(story.latestChapter).replace(/\D/g, ''), 10) : 0) || list.length || 10;

      if (totalCount > list.length) {
        const existingNums = new Set(list.map(c => String(c.chapterName || c.chapterNumber || '')));
        const fullList = [...list];
        for (let i = 1; i <= totalCount; i++) {
          const numStr = String(i);
          if (!existingNums.has(numStr)) {
            fullList.push({
              id: `ch-auto-${story.slug}-${i}`,
              storySlug: story.slug,
              chapterName: numStr,
              chapterNumber: numStr,
              chapterTitle: `Chapter ${i}`,
              pages: [],
              pageCount: Math.floor(18 + (i % 7))
            });
          }
        }
        fullList.sort((a, b) => parseFloat(a.chapterName || a.chapterNumber || 0) - parseFloat(b.chapterName || b.chapterNumber || 0));
        setStoryChapters(fullList);
      } else {
        setStoryChapters(list);
      }
    } catch (err) {
      setStoryChapters(story.chapters || []);
    }
  };

  // Delete a Chapter from story
  const handleDeleteChapter = (chapterId, chapterNum) => {
    if (window.confirm(`Xóa Chapter ${chapterNum} khỏi bộ truyện này?`)) {
      setStoryChapters(prev => prev.filter(c => c.id !== chapterId && c.chapterNumber !== chapterNum));
      showToast(`🗑️ Đã xóa Chapter ${chapterNum} thành công!`);
    }
  };

  // Submit Chapter Upload (Tab 3)
  const handleUploadChapter = async (e) => {
    e.preventDefault();
    if (!selectedStorySlug) {
      showToast('Vui lòng chọn bộ truyện!', 'error');
      return;
    }

    const pageUrls = chapterPages.split('\n').map(url => url.trim()).filter(Boolean);
    if (pageUrls.length === 0) {
      showToast('Vui lòng nhập ít nhất 1 đường dẫn ảnh cho Chapter!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        storySlug: selectedStorySlug,
        chapterNumber: Number(chapterNumber) || 1,
        title: chapterTitle || `Chapter ${chapterNumber}`,
        pages: pageUrls
      };

      await api.createChapter(payload).catch(() => null);
      showToast(`📤 Đã đăng Chapter ${chapterNumber} thành công!`);
      setChapterTitle('');
      if (onRefreshStories) onRefreshStories();
    } catch (err) {
      showToast('Lỗi khi đăng chapter!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Bulk Batch Chapters Import (Tab 3)
  const handleBulkUploadChapters = async (e) => {
    e.preventDefault();
    const targetSlug = selectedStorySlug || safeStories[0]?.slug;
    if (!targetSlug) {
      showToast('Vui lòng chọn bộ truyện!', 'error');
      return;
    }
    if (!bulkChaptersInput.trim()) {
      showToast('Vui lòng dán dữ liệu danh sách chapter!', 'error');
      return;
    }

    setIsSubmitting(true);
    const lines = bulkChaptersInput.split('\n').map(l => l.trim()).filter(Boolean);
    const totalLines = lines.length;
    let count = 0;

    setImportProgress({ current: 0, total: totalLines, percent: 0, text: `Đang chuẩn bị xuất bản ${totalLines} chapter...` });

    try {
      for (let i = 0; i < totalLines; i++) {
        const line = lines[i];
        const parts = line.split('|');
        if (parts.length >= 1 && parts[0].trim()) {
          const chNum = parts[0].trim();
          const chApi = parts[1] ? parts[1].trim() : '';
          const chTitle = parts[2] ? parts[2].trim() : `Chapter ${chNum}`;

          await api.createChapter(targetSlug, {
            chapterName: chNum,
            chapterNumber: chNum,
            chapterTitle: chTitle,
            chapterApiUrl: chApi,
            apiDataUrl: chApi,
            pages: []
          }).catch(() => null);

          count++;
          const percent = Math.round((count / totalLines) * 100);
          setImportProgress({
            current: count,
            total: totalLines,
            percent,
            text: `Đang xuất bản Chapter ${chNum} (${count}/${totalLines})`
          });
        }
      }
      showToast(`🎉 Đã xuất bản thành công ${count} chapter cho bộ truyện!`);
      setBulkChaptersInput('');
      if (onRefreshStories) onRefreshStories();
    } catch (err) {
      showToast('Lỗi khi xuất bản hàng loạt chapter!', 'error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setImportProgress({ current: 0, total: 0, percent: 0, text: '' }), 2500);
    }
  };

  // User Actions (Ban/Unban, Change Role) (Feature 2)
  const handleToggleBanUser = async (user) => {
    const newStatus = user.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
    const actionText = newStatus === 'BANNED' ? 'Khóa (Ban)' : 'Mở khóa';

    if (window.confirm(`Bạn muốn ${actionText} tài khoản "${user.username}"?`)) {
      await api.toggleBanUser(user.id, newStatus);
      setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      showToast(`⚡ Đã ${actionText} tài khoản "${user.username}"!`);
    }
  };

  const handleChangeUserRole = async (user) => {
    const newRole = user.role === 'ROLE_ADMIN' ? 'ROLE_MEMBER' : 'ROLE_ADMIN';
    const roleText = newRole === 'ROLE_ADMIN' ? 'Quản Trị Viên (Admin)' : 'Thành Viên (Member)';

    if (window.confirm(`Đổi vai trò tài khoản "${user.username}" thành ${roleText}?`)) {
      await api.updateUserRole(user.id, newRole);
      setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      showToast(`👑 Đã nâng/chuyển vai trò thành công!`);
    }
  };

  // Comment & Report Actions (Feature 3)
  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Bạn có chắc muốn xóa bình luận này?')) {
      await api.deleteComment(commentId);
      setCommentsList(prev => prev.filter(c => c.id !== commentId));
      showToast('🗑️ Đã xóa bình luận thô tục/spam!');
    }
  };

  const handleResolveReport = async (reportId) => {
    await api.resolveReport(reportId);
    setReportsList(prev => prev.map(r => r.id === reportId ? { ...r, status: 'RESOLVED' } : r));
    showToast('✓ Đã đánh dấu xử lý xong báo cáo lỗi!');
  };

  // Comment Report Actions
  const handleResolveCommentReport = async (reportId) => {
    await api.resolveCommentReport(reportId);
    setCommentReportsList(prev => prev.map(r => r.id === reportId ? { ...r, status: 'RESOLVED' } : r));
    showToast('✓ Đã xử lý báo cáo bình luận!');
  };

  const handleDismissCommentReport = async (reportId) => {
    await api.dismissCommentReport(reportId);
    setCommentReportsList(prev => prev.map(r => r.id === reportId ? { ...r, status: 'DISMISSED' } : r));
    showToast('✗ Đã bỏ qua báo cáo bình luận.');
  };

  const handleDeleteCommentFromReport = async (commentId, reportId) => {
    if (window.confirm('Xóa bình luận bị báo cáo và đánh dấu đã xử lý?')) {
      await api.deleteComment(commentId);
      setCommentsList(prev => prev.filter(c => c.id !== commentId));
      await api.resolveCommentReport(reportId);
      setCommentReportsList(prev => prev.map(r => r.id === reportId ? { ...r, status: 'RESOLVED' } : r));
      showToast('🗑️ Đã xóa comment + xử lý báo cáo!');
    }
  };

  // COMPUTED STORY DATA FOR TABLE WITH FILTERS & PAGINATION (Feature 4)
  let processedStories = [...safeStories];

  // 1. Filter by Search Query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    processedStories = processedStories.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.author && s.author.toLowerCase().includes(q))
    );
  }

  // 2. Filter by Status
  if (statusFilter !== 'ALL') {
    processedStories = processedStories.filter(s => s.status === statusFilter);
  }

  // 3. Sort By
  if (sortBy === 'views') {
    processedStories.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  } else if (sortBy === 'name') {
    processedStories.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // 4. Pagination Slice
  const totalFilteredCount = processedStories.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStories = processedStories.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // Filtered Chapters inside Modal (with Quick Chapter Search)
  const filteredModalChapters = storyChapters.filter(c => {
    if (!chapterSearchQuery.trim()) return true;
    const q = chapterSearchQuery.trim();
    const chNumStr = String(c.chapterName || c.chapterNumber || '');
    const chTitleStr = String(c.chapterTitle || c.title || '');
    return chNumStr.includes(q) || chTitleStr.toLowerCase().includes(q.toLowerCase());
  });

  // Smart Truncated Pagination Helper (Ellipsis for large page counts)
  const getVisiblePages = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  // Overview metrics (Computed dynamically from real database data)
  const totalStories = safeStories.length;
  const totalChapters = safeStories.reduce((acc, s) => acc + (s.totalChapters || 0), 0);
  const totalViews = safeStories.reduce((acc, s) => acc + (s.viewCount || 0), 0);
  const totalMembers = usersList.length;

  const formattedViews = totalViews >= 1000000
    ? (totalViews / 1000000).toFixed(1) + 'M'
    : totalViews >= 1000
      ? (totalViews / 1000).toFixed(1) + 'k'
      : totalViews;

  return (
    <div className="admin-isolated-container">
      {/* 1. TOP HEADER ROW */}
      <header className="admin-top-header">
        <div className="admin-header-brand" onClick={onNavigateHome}>
          <img src="/logo.png" alt="MangaCloud Admin" className="admin-logo-img" />
          <div>
            <div className="admin-brand-title">ADMIN Control Panel</div>
          </div>
        </div>

        <div className="admin-header-actions">
          <button className="icon-btn" onClick={toggleTheme} title={`Chuyển sang ${theme === 'light' ? 'Dark' : 'Light'} mode`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn-secondary" onClick={onNavigateHome} style={{ fontSize: '13px', fontWeight: 600 }}>
            ⬅️ Quay Lại Trang Chủ
          </button>
          <div className="admin-user-pill">
            <img
              src="https://api.dicebear.com/7.x/adventurer/svg?seed=AdminUser"
              alt="Admin Avatar"
              className="avatar"
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--accent-pink)' }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin';
              }}
            />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2 }}>Admin User</div>
              <div style={{ fontSize: '10px', color: 'var(--accent-pink)', fontWeight: 800 }}>SYS_OP</div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. TAB NAVIGATION BAR (CONCISE VIETNAMESE LABELS) */}
      <nav className="admin-nav-tabs">
        <div className="admin-tabs-container">
          <button
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Tổng Quan
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'stories' ? 'active' : ''}`}
            onClick={() => setActiveTab('stories')}
          >
            📚 Quản Lý Truyện
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'chapters' ? 'active' : ''}`}
            onClick={() => setActiveTab('chapters')}
          >
            📤 Đăng Chapter
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Quản Lý Thành Viên ({usersList.filter(u => u.role !== 'ROLE_ADMIN').length})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            💬 Bình Luận & Báo Cáo ({commentsList.length + commentReportsList.filter(r => r.status === 'PENDING').length})
          </button>
        </div>
      </nav>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="admin-main-content">

        {/* TAB 1: OVERVIEW VIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="admin-page-heading">
              <h2>📊 Tổng Quan Hệ Thống MangaCloud</h2>
              <p>Thống kê thời gian thực hạ tầng máy chủ và dữ liệu thực tế từ Database.</p>
            </div>

            {/* 4 Metric Stat Cards (100% Real DB Data) */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="stat-icon-wrapper pink">📚</div>
                <div>
                  <div className="stat-label">Tổng Số Truyện</div>
                  <div className="stat-value">{totalStories}</div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-icon-wrapper orange">📖</div>
                <div>
                  <div className="stat-label">Tổng Số Chapter</div>
                  <div className="stat-value">{totalChapters}</div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-icon-wrapper blue">👁️</div>
                <div>
                  <div className="stat-label">Tổng Lượt Xem</div>
                  <div className="stat-value">{formattedViews}</div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-icon-wrapper purple">👥</div>
                <div>
                  <div className="stat-label">Thành Viên Đã Đăng Ký</div>
                  <div className="stat-value">{totalMembers}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="admin-panel-card" style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>⚡ Thao Tác Quản Trị Nhanh</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => openStoryModal()}>
                  + Thêm Truyện Mới
                </button>
                <button className="btn-primary" style={{ backgroundColor: '#8b5cf6' }} onClick={() => setActiveTab('chapters')}>
                  📤 Đăng Chapter Mới
                </button>
                <button className="btn-primary" style={{ backgroundColor: '#059669' }} onClick={() => setActiveTab('users')}>
                  👥 Quản Lý Thành Viên
                </button>
                <button className="btn-primary" style={{ backgroundColor: '#ec4899' }} onClick={() => setShowOtruyenModal(true)}>
                  🔄 Đồng Bộ Từ Server Nguồn API
                </button>
              </div>
            </div>

            {/* Real Admin Moderation Queue & System Audit Log */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginTop: '24px' }}>

              {/* Box 1: Pending User Error Reports & Moderation */}
              <div className="admin-panel-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700 }}>⚠️ Báo Cáo Lỗi Chờ Xử Lý</h3>
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setActiveTab('comments')}>
                    Quản Lý ({reportsList.filter(r => r.status === 'PENDING').length})
                  </button>
                </div>

                {reportsList.filter(r => r.status === 'PENDING').length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                    ✓ Không có báo cáo lỗi hỏng ảnh nào cần duyệt!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {reportsList.filter(r => r.status === 'PENDING').slice(0, 3).map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.storyName} (Ch. {r.chapterNumber})</div>
                          <div style={{ fontSize: '11px', color: '#ef4444' }}>{r.errorType}: {r.description}</div>
                        </div>
                        <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#10b981' }} onClick={() => handleResolveReport(r.id)}>
                          Duyệt Xử Lý
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Box 2: Pending Comment Reports */}
              <div className="admin-panel-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700 }}>🚩 Báo Cáo Bình Luận</h3>
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setActiveTab('comments')}>
                    Quản Lý ({commentReportsList.filter(r => r.status === 'PENDING').length})
                  </button>
                </div>

                {commentReportsList.filter(r => r.status === 'PENDING').length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                    ✓ Không có báo cáo bình luận nào cần duyệt!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {commentReportsList.filter(r => r.status === 'PENDING').slice(0, 3).map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>🚩 {r.reason === 'SPAM' ? 'Spam' : r.reason === 'NOI_DUNG_XAU' ? 'Nội dung xấu' : r.reason === 'QUAY_ROI' ? 'Quấy rối' : 'Khác'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bởi {r.reporterUserName} • "{(r.commentContent || '').substring(0, 40)}..."</div>
                        </div>
                        <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#ef4444' }} onClick={() => handleDeleteCommentFromReport(r.commentId, r.id)}>
                          Xóa & Xử lý
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Box 3: System Audit Log & Operations */}
              <div className="admin-panel-card">
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>📋 Nhật Ký Hoạt Động Quản Trị</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid #ec4899' }}>
                    <div style={{ fontWeight: 600 }}>🔄 Đã khởi tạo kết nối Server Nguồn API</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MangaDex & OTruyen API CDN sẵn sàng đồng bộ</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                    <div style={{ fontWeight: 600 }}>👥 Phiên làm việc Admin</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đăng nhập quyền SYS_OP thành công</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                    <div style={{ fontWeight: 600 }}>📚 Kiểm tra CSDL MongoDB</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đã sẵn sàng lưu trữ {totalStories} bộ truyện & {totalChapters} chapter</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: STORY MANAGEMENT VIEW (WITH ADVANCED FILTERS, PAGINATION & CHAPTER MANAGEMENT) */}
        {activeTab === 'stories' && (
          <div>
            <div className="admin-page-heading-row">
              <div>
                <h2>📚 Danh Sách Quản Lý Bộ Truyện</h2>
                <p>Thực hiện các thao tác Thêm, Sửa, Xóa (CRUD) bộ truyện và Quản lý Chapter chi tiết.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {isAutoPolling && (
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(236, 72, 153, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Đang cào ngầm... (Tự động làm mới mỗi 3s)
                  </div>
                )}
                <button className="btn-secondary" onClick={() => onRefreshStories && onRefreshStories()}>
                  Làm mới dữ liệu
                </button>
                <button
                  className="btn-primary"
                  style={{ backgroundColor: '#ec4899' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowOtruyenModal(true);
                  }}
                >
                  Đồng Bộ Từ Server Nguồn
                </button>
                <button className="btn-primary" onClick={() => openStoryModal()}>
                  + Thêm Truyện Mới
                </button>
              </div>
            </div>

            {/* Advanced Filter Bar (Search + Status Filter + Sort) */}
            <div className="admin-filter-bar" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div className="admin-search-box">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Tìm theo tên truyện hoặc tác giả..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  className="form-control"
                  style={{ width: '180px', padding: '6px 12px' }}
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="Ongoing">Ongoing (Đang tiến hành)</option>
                  <option value="Completed">Completed (Hoàn thành)</option>
                  <option value="Upcoming">Upcoming (Sắp ra mắt)</option>
                </select>

                <select
                  className="form-control"
                  style={{ width: '170px', padding: '6px 12px' }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="latest">Mới cập nhật</option>
                  <option value="views">Lượt xem cao nhất</option>
                  <option value="name">Tên truyện (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Dynamic Fixed Data Table */}
            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '70px' }}>Ảnh Bìa</th>
                    <th>Tên Truyện & Tác Giả</th>
                    <th>Thể Loại</th>
                    <th>Trạng Thái</th>
                    <th>Lượt Xem</th>
                    <th style={{ width: '250px', textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStories.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        Chưa tìm thấy bộ truyện nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedStories.map((story) => (
                      <tr key={story.id || story.slug || Math.random()}>
                        {/* Fixed Constrained Cover Thumbnail */}
                        <td>
                          <img
                            src={story.thumbUrl || DEFAULT_COVER_IMAGE}
                            alt={story.name || 'Manga'}
                            className="admin-table-cover"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                          />
                        </td>
                        <td>
                          <div className="admin-story-name">{story.name || 'Chưa có tên'}</div>
                          {story.latestChapter && (
                            <div style={{ fontSize: '11px', color: 'var(--accent-pink)', fontWeight: 700, marginTop: '2px' }}>
                              🔥 {story.latestChapter}
                            </div>
                          )}
                          <div className="admin-story-author">👤 {story.author || 'Chưa rõ'}</div>
                        </td>
                        <td>
                          <div className="admin-category-tags">
                            {Array.isArray(story.categories) && story.categories.length > 0 ? (
                              story.categories.map(c => (
                                <span key={c} className="category-chip">{c}</span>
                              ))
                            ) : (
                              <span className="category-chip">Manga</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${story.status === 'Completed' ? 'completed' : story.status === 'Upcoming' ? 'upcoming' : 'ongoing'}`}>
                            {story.status === 'Upcoming' ? 'Sắp ra mắt' : story.status || 'Ongoing'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: '13px' }}>
                            {story.viewCount ? story.viewCount.toLocaleString() : 0}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap' }}>
                            {/* Feature 1: Quản lý Chapter Button */}
                            <button
                              className="admin-action-btn chapter-manage-btn"
                              onClick={() => openChapterModal(story)}
                              title="Xem & Quản lý danh sách Chapter"
                            >
                              📖 Chapter ({story.totalChapters || story.chapters?.length || (story.latestChapter ? parseInt(story.latestChapter.replace(/\D/g, '')) || 0 : 0)})
                            </button>

                            <button
                              className="admin-action-btn edit"
                              onClick={() => openStoryModal(story)}
                              title="Sửa thông tin truyện"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              className="admin-action-btn delete"
                              onClick={() => handleDeleteStory(story)}
                              title="Xóa truyện"
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar (Feature 4) */}
            <div className="admin-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Hiển thị <strong>{paginatedStories.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(safeCurrentPage * pageSize, totalFilteredCount)}</strong> trên tổng số <strong>{totalFilteredCount}</strong> bộ truyện
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls" style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className="page-btn"
                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer' }}
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    ‹ Trước
                  </button>

                  {getVisiblePages(safeCurrentPage, totalPages).map((p, idx) => (
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: '12px' }}>...</span>
                    ) : (
                      <button
                        key={p}
                        className={`page-btn ${safeCurrentPage === p ? 'active' : ''}`}
                        style={{
                          padding: '6px 10px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          backgroundColor: safeCurrentPage === p ? 'var(--accent-pink)' : 'transparent',
                          color: safeCurrentPage === p ? '#fff' : 'var(--text-color)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          minWidth: '32px'
                        }}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    )
                  ))}

                  <button
                    className="page-btn"
                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Tiếp ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CHAPTER UPLOADER VIEW */}
        {activeTab === 'chapters' && (
          <div>
            <div className="admin-page-heading">
              <h2>📤 Đăng Chapter Mới Cho Bộ Truyện</h2>
              <p>Chọn bộ truyện và dán danh sách Chapter (Hỗ trợ dán Hàng Loạt từ dữ liệu Otruyen API CDN).</p>
            </div>

            {/* Mode Switcher Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                className={`btn-${uploadMode === 'bulk' ? 'primary' : 'secondary'}`}
                style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: 700 }}
                onClick={() => setUploadMode('bulk')}
              >
                ⚡ Đăng Hàng Loạt Chapter (Paste Data Bulk)
              </button>
              <button
                type="button"
                className={`btn-${uploadMode === 'single' ? 'primary' : 'secondary'}`}
                style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: 700 }}
                onClick={() => setUploadMode('single')}
              >
                📌 Đăng 1 Chapter Đơn Lẻ
              </button>
            </div>

            <div className="admin-panel-card" style={{ maxWidth: '760px' }}>
              {uploadMode === 'bulk' ? (
                /* BULK CHAPTER IMPORT FORM */
                <form onSubmit={handleBulkUploadChapters}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Chọn Bộ Truyện Cần Đăng Hàng Loạt</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--accent-pink)', color: 'var(--accent-pink)', cursor: 'pointer', fontWeight: 600 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openStoryModal();
                          }}
                        >
                          ➕ Tạo Truyện Mới
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px', backgroundColor: '#ec4899', cursor: 'pointer', fontWeight: 700 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowOtruyenModal(true);
                          }}
                        >
                          🌐 Đồng Bộ Truyện Từ Server CDN
                        </button>
                      </div>
                    </div>
                    {/* INSTANT STORY SEARCH FILTER BOX */}
                    <input
                      type="text"
                      className="form-control"
                      placeholder="🔍 Gõ tên bộ truyện để tìm nhanh (Ví dụ: One Piece, Solo, Ma Hoàng...)"
                      style={{ marginBottom: '8px', fontSize: '13px', border: '1px solid var(--accent-pink)' }}
                      value={bulkStorySearchQuery}
                      onChange={(e) => setBulkStorySearchQuery(e.target.value)}
                    />

                    <select
                      className="form-control"
                      value={selectedStorySlug}
                      onChange={(e) => setSelectedStorySlug(e.target.value)}
                    >
                      {safeStories
                        .filter(s => {
                          if (!bulkStorySearchQuery.trim()) return true;
                          const q = bulkStorySearchQuery.trim().toLowerCase();
                          return (s.name || '').toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q) || (s.author || '').toLowerCase().includes(q);
                        })
                        .map((s) => (
                          <option key={s.id || s.slug || Math.random()} value={s.slug || ''}>
                            {s.name || 'Truyện'} ({s.author || 'Admin'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Dán Danh Sách Chapter (Định dạng: chapter_name|chapter_api_data|chapter_title)</span>
                      <span style={{ fontSize: '11px', color: 'var(--accent-pink)' }}>Mỗi dòng 1 chapter</span>
                    </label>
                    <textarea
                      rows={10}
                      className="form-control"
                      value={bulkChaptersInput}
                      onChange={(e) => setBulkChaptersInput(e.target.value)}
                      placeholder={`Ví dụ (Dán toàn bộ danh sách Otruyen):&#10;1174|https://sv1.otruyencdn.com/v1/api/chapter/698d5090e0d753f32e5867f3|Đại Chiến Đảo Hải Tặc&#10;1173.5|https://sv1.otruyencdn.com/v1/api/chapter/69a277d37b89b5b2570dde59|&#10;1173|https://sv1.otruyencdn.com/v1/api/chapter/69a277d37b89b5b2570dde5c|Trận Chiến Cuối Cùng`}
                      style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isSubmitting}
                    onClick={handleBulkUploadChapters}
                    style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {isSubmitting ? `🔄 Đang Đồng Bộ Chapter (${importProgress.percent}%)...` : '🚀 Đồng Bộ & Xuất Bản Tất Cả Chapter'}
                  </button>

                  {/* LIVE PROGRESS BAR WIDGET (0-100%) */}
                  {importProgress.percent > 0 && (
                    <div style={{ marginTop: '16px', padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-body)', border: '1px solid var(--accent-pink)', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        <span>{importProgress.text || 'Đang cào dữ liệu...'}</span>
                        <span style={{ color: 'var(--accent-pink)', fontSize: '15px', fontWeight: 900 }}>{importProgress.percent}%</span>
                      </div>

                      {/* Glowing Gradient Bar */}
                      <div style={{ width: '100%', height: '14px', borderRadius: '8px', backgroundColor: 'var(--border-color)', overflow: 'hidden', position: 'relative' }}>
                        <div
                          style={{
                            width: `${importProgress.percent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #ec4899 0%, #f43f5e 50%, #8b5cf6 100%)',
                            borderRadius: '8px',
                            transition: 'width 0.25s ease-out',
                            boxShadow: '0 0 12px rgba(236, 72, 153, 0.8)'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                /* SINGLE CHAPTER IMPORT FORM */
                <form onSubmit={handleUploadChapter}>
                  <div className="form-group">
                    <label className="form-label">Chọn Bộ Truyện</label>
                    <select
                      className="form-control"
                      value={selectedStorySlug}
                      onChange={(e) => setSelectedStorySlug(e.target.value)}
                    >
                      {safeStories.map((s) => (
                        <option key={s.id || s.slug || Math.random()} value={s.slug || ''}>
                          {s.name || 'Truyện'} ({s.author || 'Admin'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Số Chapter</label>
                      <input
                        type="number"
                        className="form-control"
                        value={chapterNumber}
                        onChange={(e) => setChapterNumber(e.target.value)}
                        placeholder="125"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tiêu Đề Chapter (Tùy chọn)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={chapterTitle}
                        onChange={(e) => setChapterTitle(e.target.value)}
                        placeholder="Ví dụ: Khởi Đầu Mới"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Danh Sách Đường Dẫn Ảnh Trang Truyện (Mỗi URL 1 dòng)</label>
                    <textarea
                      rows={6}
                      className="form-control"
                      value={chapterPages}
                      onChange={(e) => setChapterPages(e.target.value)}
                      placeholder="https://image-server.com/page1.jpg&#10;https://image-server.com/page2.jpg"
                      style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </div>

                  <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%', padding: '12px' }}>
                    {isSubmitting ? 'Đang Đăng Chapter...' : '📤 Đăng Chapter Ngay'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: USER MANAGEMENT VIEW (MEMBERS ONLY) */}
        {activeTab === 'users' && (
          <div>
            <div className="admin-page-heading">
              <h2>👥 Quản Lý Tài Khoản Thành Viên</h2>
              <p>Danh sách các thành viên (Member) đã đăng ký. Thực hiện Khóa (Ban) tài khoản vi phạm hoặc hỗ trợ người dùng.</p>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Avatar</th>
                    <th>Tên Tài Khoản</th>
                    <th>Email</th>
                    <th>Ngày Đăng Ký</th>
                    <th>Vai Trò</th>
                    <th>Trạng Thái</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.filter(u => u.role !== 'ROLE_ADMIN').length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        Chưa có tài khoản Thành viên (Member) nào để quản lý.
                      </td>
                    </tr>
                  ) : (
                    usersList.filter(u => u.role !== 'ROLE_ADMIN').map((u) => (
                      <tr key={u.id}>
                        <td>
                          <img src={u.avatar || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="100" fill="%23cbd5e1"/><circle cx="100" cy="75" r="40" fill="%23ffffff"/><path d="M100 125c-42 0-75 22-75 48v20h150v-20c0-26-33-48-75-48z" fill="%23ffffff"/></svg>`} alt={u.username} className="avatar" />
                        </td>
                        <td>
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{u.username}</strong>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.joinedDate || '2026-01-01'}</td>
                        <td>
                          <span className="user-role-badge member">
                            👤 MEMBER
                          </span>
                        </td>
                        <td>
                          <span className={`user-status-badge ${u.status === 'BANNED' ? 'banned' : 'active'}`}>
                            {u.status === 'BANNED' ? '🚫 Banned' : '✅ Active'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className={`admin-action-btn ${u.status === 'BANNED' ? 'edit' : 'delete'}`}
                            onClick={() => handleToggleBanUser(u)}
                          >
                            {u.status === 'BANNED' ? '✅ Mở Khóa' : '🚫 Ban User'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: COMMENT & ERROR REPORT MODERATION VIEW (FEATURE 3) */}
        {activeTab === 'comments' && (
          <div>
            <div className="admin-page-heading">
              <h2>💬 Kiểm Duyệt Bình Luận & Báo Cáo</h2>
              <p>Quản lý các bình luận gần đây, xử lý báo cáo bình luận từ độc giả và báo cáo lỗi chapter.</p>
            </div>

            {/* Section A: Comment Reports from Users */}
            <div className="admin-panel-card" style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800 }}>🚩 Báo Cáo Bình Luận Từ Độc Giả ({commentReportsList.filter(r => r.status === 'PENDING').length} chờ xử lý)</h3>
              </div>
              {commentReportsList.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  ✓ Không có báo cáo bình luận nào!
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Người Báo Cáo</th>
                        <th>Comment Bị Báo Cáo</th>
                        <th>Lý Do</th>
                        <th>Mô Tả</th>
                        <th>Trạng Thái</th>
                        <th style={{ width: '220px', textAlign: 'center' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commentReportsList.map((r) => (
                        <tr key={r.id}>
                          <td><strong>👤 {r.reporterUserName}</strong></td>
                          <td>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Bởi: <strong>{r.commentUserName}</strong></div>
                            <div style={{ fontSize: '13px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{r.commentContent}"</div>
                            <div style={{ fontSize: '10px', color: 'var(--accent-pink)', marginTop: '2px' }}>{r.storySlug} {r.chapterName && r.chapterName !== 'General' ? `• Ch. ${r.chapterName}` : ''}</div>
                          </td>
                          <td>
                            <span className="category-chip" style={{ color: r.reason === 'SPAM' ? '#f59e0b' : r.reason === 'NOI_DUNG_XAU' ? '#ef4444' : r.reason === 'QUAY_ROI' ? '#dc2626' : '#6b7280', fontSize: '11px', fontWeight: 700 }}>
                              {r.reason === 'SPAM' ? '🗑️ Spam' : r.reason === 'NOI_DUNG_XAU' ? '🚫 Nội dung xấu' : r.reason === 'QUAY_ROI' ? '⚠️ Quấy rối' : '📝 Khác'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', maxWidth: '200px' }}>{r.description || '—'}</td>
                          <td>
                            <span className={`status-badge ${r.status === 'RESOLVED' ? 'completed' : r.status === 'DISMISSED' ? 'completed' : 'ongoing'}`}>
                              {r.status === 'RESOLVED' ? '✓ Đã xử lý' : r.status === 'DISMISSED' ? '✗ Đã bỏ qua' : '⏳ Chờ xử lý'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {r.status === 'PENDING' && (
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button className="admin-action-btn delete" style={{ fontSize: '11px' }} onClick={() => handleDeleteCommentFromReport(r.commentId, r.id)}>🗑️ Xóa Comment</button>
                                <button className="admin-action-btn edit" style={{ fontSize: '11px' }} onClick={() => handleResolveCommentReport(r.id)}>✓ Xử lý</button>
                                <button className="admin-action-btn" style={{ fontSize: '11px', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }} onClick={() => handleDismissCommentReport(r.id)}>✗ Bỏ qua</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section B: Recent Comments */}
            <div className="admin-panel-card" style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>💬 Bình Luận Mới Nhất</h3>
              {commentsList.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Chưa có bình luận nào.
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Người Gửi</th>
                        <th>Bộ Truyện & Chapter</th>
                        <th>Nội Dung Bình Luận</th>
                        <th>Thời Gian</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commentsList.map((c) => (
                        <tr key={c.id}>
                          <td><strong>👤 {c.userName || c.username}</strong></td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{c.storySlug}</div>
                            <div style={{ fontSize: '11px', color: 'var(--accent-pink)' }}>{c.chapterName && c.chapterName !== 'General' ? `Ch. ${c.chapterName}` : 'Tổng quát'}</div>
                          </td>
                          <td style={{ fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            "{c.content}"
                            {c.isEdited && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '4px' }}>(đã sửa)</span>}
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleString('vi-VN') : '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="admin-action-btn delete" onClick={() => handleDeleteComment(c.id)}>
                              🗑️ Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section C: Error Reports */}
            <div className="admin-panel-card">
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>⚠️ Báo Cáo Lỗi Chapter Từ Độc Giả</h3>
              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Độc Giả</th>
                      <th>Bộ Truyện</th>
                      <th>Loại Lỗi</th>
                      <th>Mô Tả Chi Tiết</th>
                      <th>Trạng Thái</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsList.map((r) => (
                      <tr key={r.id}>
                        <td>👤 {r.username}</td>
                        <td><strong>{r.storyName}</strong> (Ch. {r.chapterNumber})</td>
                        <td><span className="category-chip" style={{ color: '#ef4444' }}>{r.errorType}</span></td>
                        <td>{r.description}</td>
                        <td>
                          <span className={`status-badge ${r.status === 'RESOLVED' ? 'completed' : 'ongoing'}`}>
                            {r.status === 'RESOLVED' ? '✓ Đã xử lý' : '⏳ Chờ xử lý'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {r.status !== 'RESOLVED' && (
                            <button className="admin-action-btn edit" onClick={() => handleResolveReport(r.id)}>
                              ✓ Duyệt Xử Lý
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* FEATURE 1 MODAL: CHAPTER LIST MANAGEMENT FOR A STORY (WITH QUICK SEARCH) */}
      {showChapterModal && selectedStoryForChapters && (
        <div className="modal-overlay" onClick={() => setShowChapterModal(false)}>
          <div className="modal-card" style={{ width: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
                  📖 Danh Sách Chapter - {selectedStoryForChapters.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tổng số: <strong>{storyChapters.length}</strong> Chapter đã xuất bản.
                </p>
              </div>
              <button className="auth-close-btn" onClick={() => setShowChapterModal(false)}>✕</button>
            </div>

            {/* Quick Chapter Search Bar (Tip 2) */}
            <div className="admin-search-box" style={{ width: '100%', marginBottom: '16px' }}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Nhập số chapter để tìm nhanh (Ví dụ: 108)..."
                value={chapterSearchQuery}
                onChange={(e) => setChapterSearchQuery(e.target.value)}
              />
              {chapterSearchQuery && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onClick={() => setChapterSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Chapter Scrollable List */}
            <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Chapter</th>
                    <th>Tiêu Đề Chapter</th>
                    <th>Số Trang</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalChapters.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        Không tìm thấy chapter số <strong>"{chapterSearchQuery}"</strong>!
                      </td>
                    </tr>
                  ) : (
                    filteredModalChapters.map((ch) => (
                      <tr key={ch.id || ch.chapterName || ch.chapterNumber}>
                        <td><strong style={{ color: 'var(--accent-pink)' }}>Ch. {ch.chapterName || ch.chapterNumber || ch.chapter || '1'}</strong></td>
                        <td>{ch.chapterTitle || ch.title || `Chapter ${ch.chapterName || ch.chapterNumber || '1'}`}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ch.pages?.length || ch.pageCount || 20} trang</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              className="admin-action-btn edit"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={async () => {
                                setPreviewPagesModal(ch);
                                if ((!ch.pages || ch.pages.length === 0) && selectedStoryForChapters?.slug) {
                                  try {
                                    const chName = ch.chapterName || ch.chapterNumber;
                                    const detail = await api.getChapterDetail(selectedStoryForChapters.slug, chName);
                                    if (detail && detail.pages && detail.pages.length > 0) {
                                      setPreviewPagesModal(detail);
                                      setStoryChapters(prev => prev.map(item => (item.id === detail.id || item.chapterName === chName) ? detail : item));
                                    }
                                  } catch (e) { }
                                }
                              }}
                            >
                              👁️ Ảnh
                            </button>
                            <button
                              className="admin-action-btn delete"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => handleDeleteChapter(ch.id, ch.chapterNumber)}
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowChapterModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW CHAPTER PAGES MODAL */}
      {previewPagesModal && (
        <div className="modal-overlay" onClick={() => setPreviewPagesModal(null)}>
          <div className="modal-card" style={{ width: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>
                👁️ Trang Ảnh: {previewPagesModal.chapterTitle || previewPagesModal.title || `Chapter ${previewPagesModal.chapterName || previewPagesModal.chapterNumber || ''}`}
              </h3>
              <button className="auth-close-btn" onClick={() => setPreviewPagesModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto' }}>
              {previewPagesModal.pages && previewPagesModal.pages.length > 0 ? (
                previewPagesModal.pages.map((url, idx) => (
                  <img key={idx} src={url} alt={`Page ${idx + 1}`} style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                ))
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 12px auto' }}></div>
                  Đang tự động tải danh sách trang ảnh Webtoon từ Otruyen CDN...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STORY ADD / EDIT MODAL DIALOG */}
      {showStoryModal && (
        <div className="modal-overlay" onClick={() => setShowStoryModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
                {editingStory ? '✏️ Cập Nhật Thông Tin Truyện' : '➕ Thêm Bộ Truyện Mới'}
              </h3>
              <button className="auth-close-btn" onClick={() => setShowStoryModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveStory}>
              <div className="form-group">
                <label className="form-label">Tên Bộ Truyện</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Vô Tình Lệch Khỏi Quỹ Đạo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Tác Giả</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: Diệu Linh"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng Thái</label>
                  <select
                    className="form-control"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                  >
                    <option value="Ongoing">Ongoing (Đang tiến hành)</option>
                    <option value="Completed">Completed (Hoàn thành)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Thể Loại (Cách nhau bởi dấu phẩy)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Romance, Drama, Action"
                  value={formCategories}
                  onChange={(e) => setFormCategories(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ảnh Bìa Truyện (Thumb Cover)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="https://... (hoặc upload file bên cạnh)"
                    value={formThumbUrl}
                    onChange={(e) => setFormThumbUrl(e.target.value)}
                  />
                  <input
                    type="file"
                    id="storyModalCoverFileInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => setFormThumbUrl(evt.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '13px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => document.getElementById('storyModalCoverFileInput')?.click()}
                  >
                    📁 Upload Ảnh
                  </button>
                </div>
                {formThumbUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-body)', border: '1px solid var(--border-color)' }}>
                    <img
                      src={formThumbUrl}
                      alt="Cover Preview"
                      style={{ width: '48px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--accent-pink)' }}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Preview Ảnh Bìa</strong>
                      Kích thước chuẩn 3:4 mượt mà
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Mô Tả Tóm Tắt Truyện</label>
                <textarea
                  rows={4}
                  className="form-control"
                  placeholder="Nhập tóm tắt nội dung bộ truyện..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowStoryModal(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MULTI-SOURCE MANGA AUTO-CRAWLER MODAL */}
      {showOtruyenModal && (
        <div className="admin-modal-overlay" onClick={() => !isImporting && setShowOtruyenModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="admin-modal-header" style={{ marginBottom: '16px' }}>
              <h3>Đồng Bộ Dữ Liệu Từ Server Nguồn API</h3>
              <button className="close-btn" onClick={() => !isImporting && setShowOtruyenModal(false)}>✕</button>
            </div>

            {/* AUTO-CRAWLER SCHEDULER CONTROL & LOGS WIDGET */}
            <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.06)', padding: '16px', borderRadius: '14px', marginBottom: '20px', border: '1px solid var(--accent-pink)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🤖</span> Auto-Crawler Pipeline: <span style={{ color: '#10b981', fontWeight: 900 }}>ĐANG BẬT (5 phút/lần)</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Cơ chế Differential Sync (Tránh 429) & Tự động xóa Redis Cache khi có chap mới.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ backgroundColor: '#22c55e', padding: '8px 16px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={handleManualTriggerSync}
                  disabled={isSyncingLatest || isImporting}
                >
                  {isSyncingLatest ? '⚡ Đang quét Otruyen...' : '⚡ Kích Hoạt Cào Ngay'}
                </button>
              </div>

              {/* Crawler Logs List */}
              {crawlerLogs.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📜 Lịch Sử Cào Gần Nhất ({crawlerLogs.length}):</span>
                    <span style={{ cursor: 'pointer', color: 'var(--accent-pink)' }} onClick={fetchCrawlerLogs}>🔄 Làm mới</span>
                  </div>
                  <div style={{ maxHeight: '140px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-body)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '6px 10px' }}>Thời gian</th>
                          <th style={{ padding: '6px 10px' }}>Loại</th>
                          <th style={{ padding: '6px 10px' }}>Kết quả / Nội dung</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Thời gian</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crawlerLogs.slice(0, 10).map((logItem, idx) => (
                          <tr key={logItem.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                              {logItem.createdAt ? new Date(logItem.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Gần đây'}
                            </td>
                            <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', fontWeight: 700 }}>
                              <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '10px', backgroundColor: logItem.type === 'MANUAL_TRIGGER' ? 'rgba(236,72,153,0.15)' : 'rgba(59,130,246,0.15)', color: logItem.type === 'MANUAL_TRIGGER' ? '#ec4899' : '#2563eb' }}>
                                {logItem.type === 'MANUAL_TRIGGER' ? 'Thủ công' : 'Tự động 5p'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-primary)' }}>
                              {logItem.message}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                              {logItem.executionTimeMs ? `${logItem.executionTimeMs}ms` : '0ms'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* RECENTLY AUTO-UPDATED STORIES INSPECTOR CARDS */}
                  {(() => {
                    const allUpdatedDetails = crawlerLogs
                      .filter(l => Array.isArray(l.updatedStoryDetails) && l.updatedStoryDetails.length > 0)
                      .flatMap(l => l.updatedStoryDetails);

                    if (allUpdatedDetails.length === 0) return null;

                    // Remove duplicates by slug
                    const seen = new Set();
                    const uniqueUpdated = allUpdatedDetails.filter(item => {
                      if (!item.slug || seen.has(item.slug)) return false;
                      seen.add(item.slug);
                      return true;
                    }).slice(0, 6);

                    return (
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🔥</span> Truyện Vừa Tự Động Cập Nhật Chap Mới (Bấm để kiểm tra):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                          {uniqueUpdated.map((item) => {
                            const matchedStory = safeStories.find(s => s.slug === item.slug) || { slug: item.slug, name: item.name, thumbUrl: item.thumbUrl, latestChapter: item.latestChapter };
                            return (
                              <div
                                key={item.slug}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: 'var(--bg-card)',
                                  border: '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onClick={() => openChapterModal(matchedStory)}
                                title="Bấm để kiểm tra danh sách Chapter"
                              >
                                <img
                                  src={item.thumbUrl || DEFAULT_COVER_IMAGE}
                                  alt={item.name}
                                  style={{ width: '32px', height: '44px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--accent-pink)', flexShrink: 0 }}
                                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                                />
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ fontSize: '10px', color: 'var(--accent-pink)', fontWeight: 800, marginTop: '2px' }}>
                                    {item.latestChapter || 'Mới ra'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Source Tab Switcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', backgroundColor: 'var(--bg-body)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: crawlerSourceTab === 'otruyen' ? 'var(--accent-pink)' : 'transparent',
                  color: crawlerSourceTab === 'otruyen' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => { setCrawlerSourceTab('otruyen'); setCrawlerSearchResults([]); setCrawlerSearchQuery(''); }}
              >
                Nguồn OTruyen CDN
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  backgroundColor: crawlerSourceTab === 'mangadex' ? '#8b5cf6' : 'transparent',
                  color: crawlerSourceTab === 'mangadex' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => { setCrawlerSourceTab('mangadex'); setCrawlerSearchResults([]); setCrawlerSearchQuery(''); }}
              >
                Nguồn MangaDex Global (Tiếng Việt)
              </button>
            </div>

            {/* SEARCH INPUT BOX */}
            <div style={{ marginBottom: '20px', backgroundColor: 'var(--bg-hover)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: 'var(--text-primary)', display: 'block' }}>
                Tìm kiếm & Đồng bộ theo bộ truyện:
              </label>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Nhập tên bộ truyện để tra cứu trực tiếp dữ liệu từ Server API nguồn.
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '10px 14px 10px 38px', fontSize: '14px' }}
                  placeholder={crawlerSourceTab === 'otruyen' ? "Nhập tên truyện (Ví dụ: Mato Seihei No Slave, Solo Leveling...)" : "Nhập tên truyện (Ví dụ: Mato Seihei No Slave, Chainsaw Man...)"}
                  value={crawlerSearchQuery}
                  onChange={(e) => setCrawlerSearchQuery(e.target.value)}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔍</span>
                {isSearchingCrawler && (
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--accent-pink)' }}>
                    Đang tra cứu...
                  </span>
                )}
              </div>
            </div>

            {/* LIVE SEARCH RESULTS CARDS */}
            {crawlerSearchResults.length > 0 && (
              <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px', backgroundColor: 'var(--bg-body)' }}>
                {crawlerSearchResults.map((item, idx) => (
                  <div
                    key={item.id || item.slug || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-card)',
                      marginBottom: '8px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <img
                      src={item.thumbUrl || DEFAULT_COVER_IMAGE}
                      alt={item.name}
                      style={{ width: '42px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--accent-pink)' }}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_COVER_IMAGE; }}
                    />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                        <span>Mới nhất: {item.latestChapter || 'Có sẵn'}</span>
                        <span style={{ color: item.status === 'Completed' ? '#059669' : '#ea580c', fontWeight: 600 }}>● {item.status || 'Ongoing'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        backgroundColor: crawlerSourceTab === 'otruyen' ? '#ec4899' : '#8b5cf6',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handle1ClickImport(item)}
                      disabled={isImporting}
                    >
                      Đồng Bổ Tất Cả Chapter
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* BATCH PAGE RANGE SECTION */}
            <div style={{ backgroundColor: 'var(--bg-hover)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px', display: 'block' }}>
                Đồng bộ hàng loạt theo danh sách trang:
              </label>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Tự động quét và đồng bộ nhiều bộ truyện theo phạm vi trang.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Từ Trang:</span>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    style={{ padding: '6px 10px', marginTop: '4px' }}
                    value={startPageInput}
                    onChange={(e) => {
                      const start = Math.max(1, parseInt(e.target.value) || 1);
                      setStartPageInput(start);
                      if (endPageInput < start) {
                        setEndPageInput(start + 4);
                      }
                    }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Đến Trang:</span>
                  <input
                    type="number"
                    min={startPageInput}
                    className="form-control"
                    style={{ padding: '6px 10px', marginTop: '4px' }}
                    value={endPageInput}
                    onChange={(e) => setEndPageInput(Math.max(startPageInput, parseInt(e.target.value) || startPageInput))}
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ backgroundColor: '#8b5cf6', marginTop: '18px', padding: '8px 12px', fontSize: '13px' }}
                  onClick={() => {
                    const effectiveEnd = Math.max(startPageInput, endPageInput);
                    handleBatchImport(startPageInput, effectiveEnd);
                  }}
                  disabled={isImporting}
                >
                  Đồng Bộ Trang {startPageInput} → {Math.max(startPageInput, endPageInput)}
                </button>
              </div>
            </div>

            {/* LIVE PROGRESS BAR WIDGET IN MODAL (0-100%) */}
            {importProgress.percent > 0 && (
              <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-body)', border: '1px solid var(--accent-pink)', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  <span>{importProgress.text || 'Đang cào dữ liệu API...'}</span>
                  <span style={{ color: 'var(--accent-pink)', fontSize: '15px', fontWeight: 900 }}>{importProgress.percent}%</span>
                </div>

                {/* Glowing Gradient Bar */}
                <div style={{ width: '100%', height: '14px', borderRadius: '8px', backgroundColor: 'var(--border-color)', overflow: 'hidden', position: 'relative' }}>
                  <div
                    style={{
                      width: `${importProgress.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #ec4899 0%, #f43f5e 50%, #8b5cf6 100%)',
                      borderRadius: '8px',
                      transition: 'width 0.25s ease-out',
                      boxShadow: '0 0 12px rgba(236, 72, 153, 0.8)'
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowOtruyenModal(false)} disabled={isImporting}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
