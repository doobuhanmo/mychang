'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Bookmark {
  id: string;
  name: string;
  url: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const DEFAULT_BOOKMARKS = [
  { id: 'default-1', name: '허리운동', url: 'https://www.youtube.com/watch?v=5eNOP-iyAww&t=894s', tags: ['운동'] },
  { id: 'default-2', name: '허리스트레칭', url: 'https://www.youtube.com/watch?v=i6ZyhuXzoVc&t=15s', tags: ['운동'] },
  { id: 'default-3', name: 'Vercel', url: 'https://vercel.com', tags: ['배포', '개발'] },
];

const HOME_LS_KEY = 'mc_home_icons';
const BM_CACHE_KEY = 'mc_cached_bookmarks';
const toBmId = (bmId: string) => `bm:${bmId}`;

function getDomain(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
}
function getFaviconUrl(url: string) {
  try { const { origin } = new URL(url); return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`; } catch { return null; }
}

type ModalMode = 'add' | 'edit';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [homeIconIds, setHomeIconIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedHome = localStorage.getItem(HOME_LS_KEY);
      if (savedHome) {
        try { return JSON.parse(savedHome); } catch { /* ignore */ }
      }
    }
    return [];
  });
  const [activeTag, setActiveTag] = useState('전체');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingBm, setEditingBm] = useState<Bookmark | null>(null);
  const [form, setForm] = useState({ name: '', url: '', tagsInput: '' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from('bookmarks').select('*').order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setBookmarks(data);
        try { localStorage.setItem(BM_CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
      } else if (!error) {
        // 비어있으면 기본 북마크 삽입
        const now = new Date().toISOString();
        const defaults = DEFAULT_BOOKMARKS.map((b) => ({ ...b, created_at: now, updated_at: now }));
        await supabase.from('bookmarks').insert(defaults);
        setBookmarks(defaults as Bookmark[]);
        try { localStorage.setItem(BM_CACHE_KEY, JSON.stringify(defaults)); } catch { /* ignore */ }
      } else {
        // 에러 시 로컬 캐시 또는 기본 북마크
        const cached = localStorage.getItem(BM_CACHE_KEY);
        if (cached) {
          try { setBookmarks(JSON.parse(cached)); } catch { setBookmarks(DEFAULT_BOOKMARKS as Bookmark[]); }
        } else {
          setBookmarks(DEFAULT_BOOKMARKS as Bookmark[]);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const toggleHomePin = (bmId: string) => {
    const key = toBmId(bmId);
    let updated: string[];
    if (homeIconIds.includes(key)) {
      updated = homeIconIds.filter((id) => id !== key);
    } else {
      updated = [...homeIconIds, key];
    }
    setHomeIconIds(updated);
    try {
      localStorage.setItem(HOME_LS_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const openAddModal = () => {
    setModalMode('add');
    setForm({ name: '', url: '', tagsInput: '' });
    setEditingBm(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bm: Bookmark) => {
    setModalMode('edit');
    setForm({ name: bm.name, url: bm.url, tagsInput: bm.tags.join(', ') });
    setEditingBm(bm);
    setIsModalOpen(true);
  };

  const saveBookmark = async () => {
    if (!form.url.trim()) return;
    let url = form.url.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    const tags = form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const now = new Date().toISOString();

    if (modalMode === 'add') {
      const newBm: Bookmark = { id: Date.now().toString(), name: form.name.trim() || getDomain(url), url, tags, created_at: now, updated_at: now };
      const { error } = await supabase.from('bookmarks').insert(newBm);
      const updatedList = [newBm, ...bookmarks];
      if (!error) {
        setBookmarks(updatedList);
        try { localStorage.setItem(BM_CACHE_KEY, JSON.stringify(updatedList)); } catch { /* ignore */ }
      }
    } else if (editingBm) {
      const updated = { name: form.name.trim() || getDomain(url), url, tags, updated_at: now };
      const { error } = await supabase.from('bookmarks').update(updated).eq('id', editingBm.id);
      const updatedList = bookmarks.map((b) => (b.id === editingBm.id ? { ...b, ...updated } : b));
      if (!error) {
        setBookmarks(updatedList);
        try { localStorage.setItem(BM_CACHE_KEY, JSON.stringify(updatedList)); } catch { /* ignore */ }
      }
    }
    setIsModalOpen(false);
  };

  const deleteBookmark = async (id: string) => {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    const updatedList = bookmarks.filter((b) => b.id !== id);
    if (!error) {
      setBookmarks(updatedList);
      try { localStorage.setItem(BM_CACHE_KEY, JSON.stringify(updatedList)); } catch { /* ignore */ }
      // 홈 아이콘에서도 제거
      const key = toBmId(id);
      if (homeIconIds.includes(key)) {
        const updatedHome = homeIconIds.filter((k) => k !== key);
        setHomeIconIds(updatedHome);
        try { localStorage.setItem(HOME_LS_KEY, JSON.stringify(updatedHome)); } catch { /* ignore */ }
      }
    }
  };

  const allTags = ['전체', ...Array.from(new Set(bookmarks.flatMap((b) => b.tags)))];
  const filtered = activeTag === '전체' ? bookmarks : bookmarks.filter((b) => b.tags.includes(activeTag));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🔖 북마크</h1>
        <p className="page-subtitle">유용한 링크들을 모아두는 나만의 보관함</p>
      </div>
      <div className="section-header">
        <span className="section-title">{filtered.length}개의 링크</span>
        <button className="btn btn-primary" onClick={openAddModal}>+ 추가</button>
      </div>
      {allTags.length > 1 && (
        <div className="bookmark-filters">
          {allTags.map((tag) => (
            <button key={tag} className={`filter-tag ${activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(tag)}>{tag}</button>
          ))}
        </div>
      )}
      {loading && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)' }}>불러오는 중...</div>}
      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔖</div>
          <div className="empty-state-title">북마크가 없어요</div>
          <div className="empty-state-desc">유용한 링크를 추가해봐요!</div>
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="card-grid">
          {filtered.map((bm) => {
            const faviconUrl = getFaviconUrl(bm.url);
            const isPinned = homeIconIds.includes(toBmId(bm.id));
            return (
              <div key={bm.id} className="card">
                <div className="card-actions">
                  <button
                    className={`card-pin-btn ${isPinned ? 'active' : ''}`}
                    onClick={() => toggleHomePin(bm.id)}
                    title={isPinned ? '홈 화면(나의 공간)에서 제거' : '홈 화면(나의 공간)에 추가'}
                  >
                    {isPinned ? '⭐' : '☆'}
                  </button>
                  <button className="card-edit-btn" onClick={() => openEditModal(bm)} title="수정">✏️</button>
                  <button className="card-delete-btn" onClick={() => deleteBookmark(bm.id)} title="삭제">✕</button>
                </div>
                <a href={bm.url} target="_blank" rel="noopener noreferrer" className="bookmark-card-link">
                  <div className="bookmark-card">
                    <div className="bookmark-favicon">
                      {faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={faviconUrl} alt="" width={20} height={20} />
                      ) : '🌐'}
                    </div>
                    <div className="bookmark-info">
                      <div className="bookmark-name">{bm.name}</div>
                      <div className="bookmark-url">{getDomain(bm.url)}</div>
                    </div>
                  </div>
                </a>
                {bm.tags.length > 0 && (
                  <div className="tags" style={{ marginTop: 14 }}>
                    {bm.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{modalMode === 'add' ? '북마크 추가' : '북마크 수정'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">URL *</label>
              <input className="input" placeholder="https://example.com" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} autoFocus />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">이름 (선택)</label>
              <input className="input" placeholder="비워두면 도메인으로 자동 설정" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">태그 (쉼표로 구분)</label>
              <input className="input" placeholder="개발, 디자인, 도구" value={form.tagsInput} onChange={(e) => setForm({ ...form, tagsInput: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>취소</button>
              <button className="btn btn-primary" onClick={saveBookmark}>{modalMode === 'add' ? '추가하기' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
