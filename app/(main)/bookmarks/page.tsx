'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
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
const BM_DELETED_KEY = 'mc_deleted_bookmarks';
const BM_SEEDED_KEY = 'mc_bookmarks_seeded';
const toBmId = (bmId: string) => `bm:${bmId}`;

function getDeletedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(BM_DELETED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function addDeletedId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(BM_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch { /* ignore */ }
}

function removeDeletedIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedIds();
    ids.forEach((id) => set.delete(id));
    localStorage.setItem(BM_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch { /* ignore */ }
}

function getCachedBookmarks(): Bookmark[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BM_CACHE_KEY);
    if (!raw) return null;
    const deleted = getDeletedIds();
    return (JSON.parse(raw) as Bookmark[]).filter((b) => !deleted.has(b.id));
  } catch {
    return null;
  }
}

function setCachedBookmarks(list: Bookmark[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BM_CACHE_KEY, JSON.stringify(list));
    localStorage.setItem(BM_SEEDED_KEY, '1');
    window.dispatchEvent(new Event('storage'));
  } catch { /* ignore */ }
}

const emptySubscribe = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

function getDomain(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
}
function getFaviconUrl(url: string) {
  try { const { origin } = new URL(url); return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`; } catch { return null; }
}

type ModalMode = 'add' | 'edit';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [localHomeIds, setLocalHomeIds] = useState<string[] | null>(null);

  const homeSnapshot = useSyncExternalStore(
    emptySubscribe,
    () => localStorage.getItem(HOME_LS_KEY) || '[]',
    () => '[]'
  );

  const homeIconIds = localHomeIds ?? (JSON.parse(homeSnapshot) as string[]);

  const [activeTag, setActiveTag] = useState('전체');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingBm, setEditingBm] = useState<Bookmark | null>(null);
  const [form, setForm] = useState({ name: '', url: '', tagsInput: '' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const initialDeleted = getDeletedIds();
      const initialCache = getCachedBookmarks();
      if (initialCache !== null) {
        setBookmarks(initialCache);
      } else {
        const now = new Date().toISOString();
        const defaults = DEFAULT_BOOKMARKS
          .filter((b) => !initialDeleted.has(b.id))
          .map((b) => ({ ...b, created_at: now, updated_at: now })) as Bookmark[];
        setBookmarks(defaults);
      }
      setLoading(false);

      const { data, error } = await supabase.from('bookmarks').select('*').order('created_at', { ascending: false });
      if (cancelled) return;

      const deleted = getDeletedIds();
      const latestCache = getCachedBookmarks();
      const isSeeded = typeof window !== 'undefined' && localStorage.getItem(BM_SEEDED_KEY) === '1';

      if (!error && data && data.length > 0) {
        // 오프라인 중 삭제 대기했던 항목이 DB에 남아있으면 DB에서도 삭제
        const lingeringIds = data.filter((b) => deleted.has(b.id)).map((b) => b.id);
        if (lingeringIds.length > 0) {
          supabase.from('bookmarks').delete().in('id', lingeringIds).then(({ error: delErr }) => {
            if (!delErr) removeDeletedIds(lingeringIds);
          });
        }

        // DB에서 불러온 데이터를 기준으로 상태 및 캐시 동기화
        const remoteValid = (data as Bookmark[]).filter((b) => !deleted.has(b.id));
        setBookmarks(remoteValid);
        setCachedBookmarks(remoteValid);
      } else if (!error) {
        if (!isSeeded && latestCache === null) {
          // DB가 완전히 비어있는 최초 1회만 기본 북마크 DB 삽입
          const now = new Date().toISOString();
          const defaults = DEFAULT_BOOKMARKS
            .filter((b) => !deleted.has(b.id))
            .map((b) => ({ ...b, created_at: now, updated_at: now }));
          setBookmarks(defaults as Bookmark[]);
          setCachedBookmarks(defaults as Bookmark[]);
          if (defaults.length > 0) {
            supabase.from('bookmarks').insert(defaults).then(() => {});
          }
        } else {
          setBookmarks([]);
          setCachedBookmarks([]);
        }
      } else if (latestCache === null) {
        // DB 연결 실패 시에만 로컬 캐시/기본값 폴백
        const now = new Date().toISOString();
        const defaults = DEFAULT_BOOKMARKS
          .filter((b) => !deleted.has(b.id))
          .map((b) => ({ ...b, created_at: now, updated_at: now })) as Bookmark[];
        setCachedBookmarks(defaults);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const toggleHomePin = (bmId: string) => {
    const key = toBmId(bmId);
    let updated: string[];
    if (homeIconIds.includes(key)) {
      updated = homeIconIds.filter((id) => id !== key);
    } else {
      updated = [...homeIconIds, key];
    }
    setLocalHomeIds(updated);
    try {
      localStorage.setItem(HOME_LS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
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
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    const tags = form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const now = new Date().toISOString();

    setIsModalOpen(false);

    if (modalMode === 'add') {
      const newBm: Bookmark = {
        id: Date.now().toString(),
        name: form.name.trim() || getDomain(url),
        url,
        tags,
        created_at: now,
        updated_at: now,
      };
      setBookmarks((prev) => {
        const updatedList = [newBm, ...prev];
        setCachedBookmarks(updatedList);
        return updatedList;
      });
      await supabase.from('bookmarks').insert(newBm);
    } else if (editingBm) {
      const targetId = editingBm.id;
      const updated = { name: form.name.trim() || getDomain(url), url, tags, updated_at: now };
      setBookmarks((prev) => {
        const updatedList = prev.map((b) => (b.id === targetId ? { ...b, ...updated } : b));
        setCachedBookmarks(updatedList);
        return updatedList;
      });
      await supabase.from('bookmarks').update(updated).eq('id', targetId);
    }
  };

  const deleteBookmark = async (id: string) => {
    addDeletedId(id);

    setBookmarks((prev) => {
      const updatedList = prev.filter((b) => b.id !== id);
      setCachedBookmarks(updatedList);
      return updatedList;
    });

    // 홈 아이콘에서도 즉시 제거
    const key = toBmId(id);
    if (homeIconIds.includes(key)) {
      const updatedHome = homeIconIds.filter((k) => k !== key);
      setLocalHomeIds(updatedHome);
      try {
        localStorage.setItem(HOME_LS_KEY, JSON.stringify(updatedHome));
        window.dispatchEvent(new Event('storage'));
      } catch { /* ignore */ }
    }

    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (!error) {
      removeDeletedIds([id]);
    }
  };

  const allTags = ['전체', ...Array.from(new Set(bookmarks.flatMap((b) => b.tags)))];
  const currentTag = allTags.includes(activeTag) ? activeTag : '전체';
  const filtered = currentTag === '전체' ? bookmarks : bookmarks.filter((b) => b.tags.includes(currentTag));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🔖 북마크</h1>
        <p className="page-subtitle">유용한 링크들을 모아두는 나만의 보관함</p>
      </div>
      <div className="section-header">
        <span className="section-title">{filtered.length}개의 링크</span>
        <button type="button" className="btn btn-primary" onClick={openAddModal}>+ 추가</button>
      </div>
      {allTags.length > 1 && (
        <div className="bookmark-filters">
          {allTags.map((tag) => (
            <button type="button" key={tag} className={`filter-tag ${currentTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(tag)}>{tag}</button>
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
                    type="button"
                    className={`card-pin-btn ${isPinned ? 'active' : ''}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleHomePin(bm.id); }}
                    title={isPinned ? '홈 화면(나의 공간)에서 제거' : '홈 화면(나의 공간)에 추가'}
                  >
                    {isPinned ? '⭐' : '☆'}
                  </button>
                  <button
                    type="button"
                    className="card-edit-btn"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(bm); }}
                    title="수정"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="card-delete-btn"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteBookmark(bm.id); }}
                    title="삭제"
                  >
                    ✕
                  </button>
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
              <button type="button" className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">URL *</label>
              <input
                className="input"
                placeholder="https://example.com"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && saveBookmark()}
                autoFocus
              />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">이름 (선택)</label>
              <input
                className="input"
                placeholder="비워두면 도메인으로 자동 설정"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && saveBookmark()}
              />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">태그 (쉼표로 구분)</label>
              <input
                className="input"
                placeholder="개발, 디자인, 도구"
                value={form.tagsInput}
                onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && saveBookmark()}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>취소</button>
              <button type="button" className="btn btn-primary" onClick={saveBookmark}>{modalMode === 'add' ? '추가하기' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
