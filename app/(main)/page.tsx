'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';

interface AppIcon {
  id: string;
  label: string;
  icon: string;
  faviconUrl?: string | null;
  href: string;
  /** true면 새 탭으로 열기 */
  external?: boolean;
}

interface Bookmark {
  id: string;
  name: string;
  url: string;
  tags: string[];
}

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: 'default-1', name: '허리운동', url: 'https://www.youtube.com/watch?v=5eNOP-iyAww&t=894s', tags: ['운동'] },
  { id: 'default-2', name: '허리스트레칭', url: 'https://www.youtube.com/watch?v=i6ZyhuXzoVc&t=15s', tags: ['운동'] },
  { id: 'default-3', name: 'Vercel', url: 'https://vercel.com', tags: ['배포', '개발'] },
];

function getFaviconUrl(url: string) {
  try {
    const { origin } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return null;
  }
}

/** 북마크 ID를 home icon ID로 변환 */
const toBmId = (bmId: string) => `bm:${bmId}`;
/** home icon ID가 북마크인지 확인 */
const isBmId = (id: string) => id.startsWith('bm:');
/** home icon ID에서 원본 북마크 ID 추출 */
const rawBmId = (id: string) => id.slice(3);

const ALL_APPS: AppIcon[] = [
  { id: 'study',     label: '영어공부',    icon: '🎧', href: '/projects/study' },
  { id: 'bookmarks', label: '북마크',      icon: '🔖', href: '/bookmarks' },
  { id: 'notes',     label: '메모',        icon: '📝', href: '/notes' },
  { id: 'theoker',   label: '더커',        icon: '📈', href: '/projects/theoker' },
  { id: 'projects',  label: '프로젝트',    icon: '🚀', href: '/projects' },
  { id: 'hongdae',   label: '홍대',        icon: '🍜', href: '/hongdae' },
];

const DEFAULT_IDS = ['study', 'bookmarks', 'notes'];
const LS_KEY = 'mc_home_icons';
const BM_CACHE_KEY = 'mc_cached_bookmarks';

const emptySubscribe = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

type ModalTab = 'app' | 'bookmark';

export default function HomePage() {
  const [localIconIds, setLocalIconIds] = useState<string[] | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('app');

  // useSyncExternalStore로 SSR Hydration Mismatch 완전 방지
  const iconSnapshot = useSyncExternalStore(
    emptySubscribe,
    () => localStorage.getItem(LS_KEY) || JSON.stringify(DEFAULT_IDS),
    () => JSON.stringify(DEFAULT_IDS)
  );

  const iconIds = localIconIds ?? (JSON.parse(iconSnapshot) as string[]);

  // 북마크 상태
  const [localBookmarks, setLocalBookmarks] = useState<Bookmark[] | null>(null);
  const [bmLoading, setBmLoading] = useState(false);

  const bmSnapshot = useSyncExternalStore(
    emptySubscribe,
    () => localStorage.getItem(BM_CACHE_KEY) || JSON.stringify(DEFAULT_BOOKMARKS),
    () => JSON.stringify(DEFAULT_BOOKMARKS)
  );

  const bookmarks = localBookmarks ?? (JSON.parse(bmSnapshot) as Bookmark[]);

  /** 북마크 데이터 로드 */
  const loadBookmarks = useCallback(async () => {
    setBmLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id, name, url, tags')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setLocalBookmarks(data);
        try {
          localStorage.setItem(BM_CACHE_KEY, JSON.stringify(data));
          window.dispatchEvent(new Event('storage'));
        } catch { /* ignore */ }
      } else if (!data || data.length === 0) {
        setLocalBookmarks(DEFAULT_BOOKMARKS);
      }
    } catch {
      setLocalBookmarks(DEFAULT_BOOKMARKS);
    } finally {
      setBmLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase
      .from('bookmarks')
      .select('id, name, url, tags')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setLocalBookmarks(data);
          try {
            localStorage.setItem(BM_CACHE_KEY, JSON.stringify(data));
            window.dispatchEvent(new Event('storage'));
          } catch { /* ignore */ }
        }
      });
  }, []);

  const openAddModal = () => {
    loadBookmarks();
    const remainingApps = ALL_APPS.filter((a) => !iconIds.includes(a.id));
    if (remainingApps.length === 0) {
      setModalTab('bookmark');
    } else {
      setModalTab('app');
    }
    setShowAddModal(true);
  };

  const handleTabChange = (tab: ModalTab) => {
    setModalTab(tab);
    if (tab === 'bookmark') loadBookmarks();
  };

  const save = (ids: string[]) => {
    setLocalIconIds(ids);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(ids));
      window.dispatchEvent(new Event('storage'));
    } catch { /* ignore */ }
  };

  const removeIcon = (id: string) => save(iconIds.filter((i) => i !== id));

  const addIcon = (id: string) => {
    if (!iconIds.includes(id)) save([...iconIds, id]);
    setShowAddModal(false);
  };

  /** iconIds(앱 + 북마크 혼합)를 AppIcon 배열로 변환 */
  const resolveIcons = (): AppIcon[] => {
    return iconIds
      .map((id) => {
        if (isBmId(id)) {
          const rawId = rawBmId(id);
          const bm = bookmarks.find((b) => b.id === rawId) || DEFAULT_BOOKMARKS.find((b) => b.id === rawId);
          if (!bm) return null;
          return {
            id,
            label: bm.name,
            icon: '🌐',
            faviconUrl: getFaviconUrl(bm.url),
            href: bm.url,
            external: true,
          } as AppIcon;
        }
        return ALL_APPS.find((a) => a.id === id) ?? null;
      })
      .filter(Boolean) as AppIcon[];
  };

  const icons = resolveIcons();
  const availableApps = ALL_APPS.filter((a) => !iconIds.includes(a.id));
  // 이미 추가된 북마크 ID 집합
  const addedBmIds = new Set(iconIds.filter(isBmId).map(rawBmId));
  const availableBookmarks = bookmarks.filter((b) => !addedBmIds.has(b.id));

  return (
    <div className="home-page">
      {/* 헤더 */}
      <div className="home-header">
        <span className="home-header-title">나의 공간</span>
        <button
          type="button"
          className={`home-edit-btn ${editMode ? 'active' : ''}`}
          onClick={() => { setEditMode((v) => !v); setShowAddModal(false); }}
        >
          {editMode ? '완료' : '편집'}
        </button>
      </div>

      {/* 아이콘 그리드 */}
      <div className="app-grid">
        {icons.map((app) => (
          <div key={app.id} className={`app-icon-wrap ${editMode ? 'wiggle' : ''}`}>
            {editMode && (
              <button type="button" className="app-remove-btn" onClick={() => removeIcon(app.id)}>✕</button>
            )}
            {editMode ? (
              <div className="app-icon">
                {app.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.faviconUrl} alt="" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} />
                ) : (
                  <span className="app-icon-emoji">{app.icon}</span>
                )}
              </div>
            ) : app.external ? (
              <a href={app.href} target="_blank" rel="noopener noreferrer" className="app-icon">
                {app.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.faviconUrl} alt="" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} />
                ) : (
                  <span className="app-icon-emoji">{app.icon}</span>
                )}
              </a>
            ) : (
              <Link href={app.href} className="app-icon">
                {app.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.faviconUrl} alt="" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} />
                ) : (
                  <span className="app-icon-emoji">{app.icon}</span>
                )}
              </Link>
            )}
            <span className="app-icon-label">{app.label}</span>
          </div>
        ))}

        {/* 추가 버튼 (편집 모드 또는 앱/북마크 추가가 필요할 때) */}
        {editMode && (
          <div className="app-icon-wrap">
            <button type="button" className="app-icon app-add-btn" onClick={openAddModal} title="앱/북마크 바로가기 추가">
              <span className="app-icon-emoji">＋</span>
            </button>
            <span className="app-icon-label">추가</span>
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">바로가기 추가</h2>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: 6, padding: '4px 0 12px', borderBottom: '1px solid var(--glass-border)', marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => handleTabChange('app')}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  background: modalTab === 'app' ? 'var(--accent-dim)' : 'transparent',
                  color: modalTab === 'app' ? 'var(--accent)' : 'var(--text-2)',
                  transition: 'all 0.15s',
                }}
              >
                📱 기본 앱 ({availableApps.length})
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('bookmark')}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  background: modalTab === 'bookmark' ? 'var(--accent-dim)' : 'transparent',
                  color: modalTab === 'bookmark' ? 'var(--accent)' : 'var(--text-2)',
                  transition: 'all 0.15s',
                }}
              >
                🔖 북마크 ({availableBookmarks.length})
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
              {/* 앱 탭 */}
              {modalTab === 'app' && (
                availableApps.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 10px', fontSize: 13 }}>
                    <div>모든 기본 앱이 추가되었습니다.</div>
                    <button
                      type="button"
                      onClick={() => handleTabChange('bookmark')}
                      style={{
                        marginTop: 10,
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--glass-border)',
                        background: 'var(--accent-dim)',
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      🔖 북마크 목록 보기 ({availableBookmarks.length})
                    </button>
                  </div>
                ) : (
                  availableApps.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => addIcon(app.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 16px', borderRadius: 10,
                        border: '1px solid var(--glass-border)',
                        background: 'var(--bg-surface)',
                        cursor: 'pointer', fontSize: 14,
                        color: 'var(--text-1)', textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{app.icon}</span>
                      <span style={{ fontWeight: 600 }}>{app.label}</span>
                    </button>
                  ))
                )
              )}

              {/* 북마크 탭 */}
              {modalTab === 'bookmark' && (
                bmLoading && bookmarks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 13 }}>
                    북마크 불러오는 중...
                  </div>
                ) : availableBookmarks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 10px', fontSize: 13 }}>
                    {bookmarks.length === 0 ? '등록된 북마크가 없습니다.' : '모든 북마크가 홈에 추가되었습니다.'}
                    <div style={{ marginTop: 10 }}>
                      <Link
                        href="/bookmarks"
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid var(--glass-border)',
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                          textDecoration: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        onClick={() => setShowAddModal(false)}
                      >
                        + 북마크 등록하러 가기
                      </Link>
                    </div>
                  </div>
                ) : (
                  availableBookmarks.map((bm) => {
                    const favicon = getFaviconUrl(bm.url);
                    return (
                      <button
                        key={bm.id}
                        type="button"
                        onClick={() => addIcon(toBmId(bm.id))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 10,
                          border: '1px solid var(--glass-border)',
                          background: 'var(--bg-surface)',
                          cursor: 'pointer', fontSize: 14,
                          color: 'var(--text-1)', textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                      >
                        <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {favicon
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={favicon} alt="" width={24} height={24} style={{ borderRadius: 4, objectFit: 'contain' }} />
                            : <span style={{ fontSize: 20 }}>🌐</span>
                          }
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bm.name}</div>
                          {bm.tags.length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{bm.tags.join(' · ')}</div>
                          )}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>+ 추가</span>
                      </button>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
