'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface AppIcon {
  id: string;
  label: string;
  icon: string;
  href: string;
}

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

export default function HomePage() {
  const [iconIds, setIconIds] = useState<string[]>(DEFAULT_IDS);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try { setIconIds(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoaded(true);
  }, []);

  const save = (ids: string[]) => {
    setIconIds(ids);
    localStorage.setItem(LS_KEY, JSON.stringify(ids));
  };

  const removeIcon = (id: string) => save(iconIds.filter((i) => i !== id));
  const addIcon = (id: string) => {
    if (!iconIds.includes(id)) save([...iconIds, id]);
    setShowAddModal(false);
  };

  const icons = iconIds.map((id) => ALL_APPS.find((a) => a.id === id)).filter(Boolean) as AppIcon[];
  const available = ALL_APPS.filter((a) => !iconIds.includes(a.id));

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
            ) : (
              <Link href={app.href} className="app-icon">
                <span className="app-icon-emoji">{app.icon}</span>
              </Link>
            )}
            <span className="app-icon-label">{app.label}</span>
          </div>
        ))}

        {/* 추가 버튼 (편집 모드에서만) */}
        {editMode && available.length > 0 && (
          <div className="app-icon-wrap">
            <button className="app-icon app-add-btn" onClick={() => setShowAddModal(true)}>
              <span className="app-icon-emoji">＋</span>
            </button>
            <span className="app-icon-label">추가</span>
          </div>
        )}
      </div>

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">앱 추가</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
              {available.map((app) => (
                <button
                  key={app.id}
                  onClick={() => addIcon(app.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', borderRadius: 10,
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-surface)',
                    cursor: 'pointer', fontSize: 15,
                    color: 'var(--text-1)',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{app.icon}</span>
                  {app.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
