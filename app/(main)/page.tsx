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
  { id: 'default-3', name: 'Vercel', url: 'https://vercel.com', tags: ['배포', '개발'] },
  { id: 'default-1', name: '허리운동', url: 'https://www.youtube.com/watch?v=5eNOP-iyAww&t=894s', tags: ['운동'] },
  { id: 'default-2', name: '허리스트레칭', url: 'https://www.youtube.com/watch?v=i6ZyhuXzoVc&t=15s', tags: ['운동'] },
];

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

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

type ModalFilter = 'all' | 'app' | 'bookmark';

export default function HomePage() {
  const [localIconIds, setLocalIconIds] = useState<string[] | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalFilter, setModalFilter] = useState<ModalFilter>('all');

  // 직접 웹페이지 추가 폼 상태
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  // useSyncExternalStore로 SSR Hydration Mismatch 방지
  const iconSnapshot = useSyncExternalStore(
    emptySubscribe,
    () => localStorage.getItem(LS_KEY) || JSON.stringify(DEFAULT_IDS),
    () => JSON.stringify(DEFAULT_IDS)
  );

  const iconIds = localIconIds ?? (JSON.parse(iconSnapshot) as string[]);

  // 북마크 상태
  const [localBookmarks, setLocalBookmarks] = useState<Bookmark[] | null>(null);

  const bmSnapshot = useSyncExternalStore(
    emptySubscribe,
    () => localStorage.getItem(BM_CACHE_KEY) || JSON.stringify(DEFAULT_BOOKMARKS),
    () => JSON.stringify(DEFAULT_BOOKMARKS)
  );

  const bookmarks = localBookmarks ?? (JSON.parse(bmSnapshot) as Bookmark[]);

  /** 북마크 데이터 로드 */
  const loadBookmarks = useCallback(async () => {
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
    setModalFilter('all');
    setShowCustomForm(false);
    setCustomName('');
    setCustomUrl('');
    setShowAddModal(true);
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

  // 커스텀 웹페이지 북마크 추가 & 즉시 홈 화면에 배치
  const handleAddCustomBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    let url = customUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const name = customName.trim() || getDomain(url);
    const newBm: Bookmark = {
      id: 'custom-' + Date.now().toString(),
      name,
      url,
      tags: ['웹'],
    };

    // Supabase에 저장 시도
    try {
      await supabase.from('bookmarks').insert({
        ...newBm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch { /* ignore */ }

    // 로컬 목록 & 캐시 갱신
    const updatedBms = [newBm, ...bookmarks.filter((b) => b.id !== newBm.id)];
    setLocalBookmarks(updatedBms);
    try {
      localStorage.setItem(BM_CACHE_KEY, JSON.stringify(updatedBms));
      window.dispatchEvent(new Event('storage'));
    } catch { /* ignore */ }

    // 홈 화면에 즉시 추가
    addIcon(toBmId(newBm.id));
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

  const totalAvailable = availableApps.length + availableBookmarks.length;

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

        {/* 추가 버튼 (편집 모드에서) */}
        {editMode && (
          <div className="app-icon-wrap">
            <button type="button" className="app-icon app-add-btn" onClick={openAddModal} title="앱/북마크 바로가기 추가">
              <span className="app-icon-emoji">＋</span>
            </button>
            <span className="app-icon-label">추가</span>
          </div>
        )}
      </div>

      {/* 추가 모달 (앱 + 북마크 통합) */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">바로가기 추가</h2>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {/* 필터 탭 */}
            <div style={{ display: 'flex', gap: 4, padding: '2px', background: 'var(--bg-overlay)', borderRadius: 8, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setModalFilter('all')}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: 12.5,
                  background: modalFilter === 'all' ? 'var(--bg-surface)' : 'transparent',
                  color: modalFilter === 'all' ? 'var(--accent)' : 'var(--text-2)',
                  boxShadow: modalFilter === 'all' ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                전체 ({totalAvailable})
              </button>
              <button
                type="button"
                onClick={() => setModalFilter('app')}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: 12.5,
                  background: modalFilter === 'app' ? 'var(--bg-surface)' : 'transparent',
                  color: modalFilter === 'app' ? 'var(--accent)' : 'var(--text-2)',
                  boxShadow: modalFilter === 'app' ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                📱 앱 ({availableApps.length})
              </button>
              <button
                type="button"
                onClick={() => setModalFilter('bookmark')}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: 12.5,
                  background: modalFilter === 'bookmark' ? 'var(--bg-surface)' : 'transparent',
                  color: modalFilter === 'bookmark' ? 'var(--accent)' : 'var(--text-2)',
                  boxShadow: modalFilter === 'bookmark' ? 'var(--shadow-xs)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                🔖 웹 북마크 ({availableBookmarks.length})
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 380, overflowY: 'auto', paddingRight: 2 }}>
              {/* 1. 기본 앱 섹션 */}
              {(modalFilter === 'all' || modalFilter === 'app') && availableApps.length > 0 && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📱 기본 앱
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {availableApps.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => addIcon(app.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 10,
                          border: '1px solid var(--glass-border)',
                          background: 'var(--bg-surface)',
                          cursor: 'pointer', fontSize: 14,
                          color: 'var(--text-1)', textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{app.icon}</span>
                        <span style={{ fontWeight: 600, flex: 1 }}>{app.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>+ 추가</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. 웹페이지 북마크 섹션 */}
              {(modalFilter === 'all' || modalFilter === 'bookmark') && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🔖 웹페이지 북마크
                  </div>
                  {availableBookmarks.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '14px 10px', fontSize: 12.5, border: '1px dashed var(--glass-border)', borderRadius: 8 }}>
                      추가 가능한 북마크가 없습니다.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {availableBookmarks.map((bm) => {
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
                              transition: 'all 0.15s',
                            }}
                          >
                            <span style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {favicon
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={favicon} alt="" width={22} height={22} style={{ borderRadius: 4, objectFit: 'contain' }} />
                                : <span style={{ fontSize: 18 }}>🌐</span>
                              }
                            </span>
                            <span style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bm.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getDomain(bm.url)}</div>
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>+ 추가</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. 새 웹페이지 직접 추가 버튼/폼 */}
              <div style={{ marginTop: 4, borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
                {!showCustomForm ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(true)}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: '1px dashed var(--accent-border)',
                      background: 'var(--accent-dim)', color: 'var(--accent)',
                      fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <span>➕</span>
                    <span>새 웹페이지 링크 직접 추가</span>
                  </button>
                ) : (
                  <form onSubmit={handleAddCustomBookmark} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>웹페이지 바로가기 만들기</div>
                    <input
                      type="text"
                      className="input"
                      placeholder="URL 입력 (예: vercel.com)"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      style={{ fontSize: 13, padding: '7px 10px' }}
                      autoFocus
                      required
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="이름 (비워두면 도메인으로 자동 설정)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      style={{ fontSize: 13, padding: '7px 10px' }}
                    />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setShowCustomForm(false)}
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: 12 }}
                      >
                        홈에 추가
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
