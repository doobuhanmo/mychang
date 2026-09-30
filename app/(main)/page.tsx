'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface AppIcon {
  id: string;
  label: string;
  icon: string;
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

function getFaviconUrl(url: string) {
  try { const { origin } = new URL(url); return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`; } catch { return null; }
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

type ModalTab = 'app' | 'bookmark';

export default function HomePage() {
  const [iconIds, setIconIds] = useState<string[]>(DEFAULT_IDS);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('app');
  const [loaded, setLoaded] = useState(false);

  // 북마크 관련
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bmLoading, setBmLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    let ids = DEFAULT_IDS;
    if (saved) {
      try { ids = JSON.parse(saved); } catch { /* ignore */ }
    }
    setIconIds(ids);
    setLoaded(true);

    // bm: 아이콘이 있으면 북마크 데이터 미리 로드
    if (ids.some((id: string) => id.startsWith('bm:'))) {
      supabase.from('bookmarks').select('id, name, url, tags').order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setBookmarks(data); });
    }
  }, []);

  /** 북마크 탭 열 때 한 번만 로드 */
  const loadBookmarks = useCallback(async () => {
    if (bookmarks.length > 0) return;
    setBmLoading(true);
    const { data } = await supabase.from('bookmarks').select('id, name, url, tags').order('created_at', { ascending: false });
    if (data) setBookmarks(data);
    setBmLoading(false);
  }, [bookmarks.length]);

  const openAddModal = () => {
    setModalTab('app');
    setShowAddModal(true);
  };

  const handleTabChange = (tab: ModalTab) => {
    setModalTab(tab);
    if (tab === 'bookmark') loadBookmarks();
  };

  const save = (ids: string[]) => {
    setIconIds(ids);
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  };

  const removeIcon = (id: string) => save(iconIds.filter((i) => i !== id));

  const addIcon = (id: string) => {
    if (!iconIds.includes(id)) save([...iconIds, id]);
    setShowAddModal(false);
  };

  /** iconIds(앱 + 북마크 혼합)를 AppIcon 배열로 변환 */
  const resolveIcons = (): AppIcon[] => {
    return iconIds.map((id) => {
      if (isBmId(id)) {
        const bm = bookmarks.find((b) => b.id === rawBmId(id));
        if (!bm) return null;
        return { id, label: bm.name, icon: '🌐', href: bm.url, external: true } as AppIcon;
      }
      return ALL_APPS.find((a) => a.id === id) ?? null;
    }).filter(Boolean) as AppIcon[];
  };

  const icons = resolveIcons();
  const availableApps = ALL_APPS.filter((a) => !iconIds.includes(a.id));
  // 이미 추가된 북마크 ID 집합
  const addedBmIds = new Set(iconIds.filter(isBmId).map(rawBmId));
  const availableBookmarks = bookmarks.filter((b) => !addedBmIds.has(b.id));

  if (!loaded) return null;

  return (
    <div className="home-page">
      {/* 헤더 */}
      <div className="home-header">
        <span className="home-header-title">나의 공간</span>
        <button
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
              <button className="app-remove-btn" onClick={() => removeIcon(app.id)}>✕</button>
            )}
            {editMode ? (
              <div className="app-icon">
                <span className="app-icon-emoji">{app.icon}</span>
              </div>
            ) : app.external ? (
              <a href={app.href} target="_blank" rel="noopener noreferrer" className="app-icon">
                <span className="app-icon-emoji">{app.icon}</span>
              </a>
            ) : (
              <Link href={app.href} className="app-icon">
                <span className="app-icon-emoji">{app.icon}</span>
              </Link>
            )}
            <span className="app-icon-label">{app.label}</span>
          </div>
        ))}

        {/* 추가 버튼 (편집 모드에서만) */}
        {editMode && (
          <div className="app-icon-wrap">
            <button className="app-icon app-add-btn" onClick={openAddModal}>
              <span className="app-icon-emoji">＋</span>
            </button>
            <span className="app-icon-label">추가</span>
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 340 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">바로가기 추가</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: 4, padding: '4px 0 12px', borderBottom: '1px solid var(--glass-border)', marginBottom: 12 }}>
              {(['app', 'bookmark'] as ModalTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
                    cursor: 'pointer', fontWeight: 500, fontSize: 14,
                    background: modalTab === tab ? 'var(--accent-dim)' : 'transparent',
                    color: modalTab === tab ? 'var(--accent)' : 'var(--text-2)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab === 'app' ? '📱 앱' : '🔖 북마크'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {/* 앱 탭 */}
              {modalTab === 'app' && (
                availableApps.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 14 }}>
                    추가할 앱이 없어요
                  </div>
                ) : (
                  availableApps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => addIcon(app.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 16px', borderRadius: 10,
                        border: '1px solid var(--glass-border)',
                        background: 'var(--bg-surface)',
                        cursor: 'pointer', fontSize: 15,
                        color: 'var(--text-1)', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{app.icon}</span>
                      {app.label}
                    </button>
                  ))
                )
              )}

              {/* 북마크 탭 */}
              {modalTab === 'bookmark' && (
                bmLoading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 14 }}>
                    불러오는 중...
                  </div>
                ) : availableBookmarks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 14 }}>
                    {bookmarks.length === 0 ? '북마크가 없어요' : '모든 북마크가 추가됐어요'}
                  </div>
                ) : (
                  availableBookmarks.map((bm) => {
                    const favicon = getFaviconUrl(bm.url);
                    return (
                      <button
                        key={bm.id}
                        onClick={() => addIcon(toBmId(bm.id))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 16px', borderRadius: 10,
                          border: '1px solid var(--glass-border)',
                          background: 'var(--bg-surface)',
                          cursor: 'pointer', fontSize: 15,
                          color: 'var(--text-1)', textAlign: 'left',
                        }}
                      >
                        <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {favicon
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={favicon} alt="" width={24} height={24} style={{ borderRadius: 4 }} />
                            : <span style={{ fontSize: 20 }}>🌐</span>
                          }
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bm.name}</div>
                          {bm.tags.length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{bm.tags.join(' · ')}</div>
                          )}
                        </span>
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
