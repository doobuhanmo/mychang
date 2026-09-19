'use client';

import { useEffect, useState } from 'react';

interface Bookmark {
  id: string;
  name: string;
  url: string;
  tags: string[];
  createdAt: string;
}

const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    id: '1',
    name: '허리운동',
    url: 'https://www.youtube.com/watch?v=5eNOP-iyAww&t=894s',
    tags: ['운동'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: '허리스트레칭',
    url: 'https://www.youtube.com/watch?v=i6ZyhuXzoVc&t=15s',
    tags: ['운동'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Vercel',
    url: 'https://vercel.com',
    tags: ['배포', '개발'],
    createdAt: new Date().toISOString(),
  },
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

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeTag, setActiveTag] = useState<string>('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', tagsInput: '' });

  useEffect(() => {
    const saved = localStorage.getItem('mc_bookmarks');
    setBookmarks(saved ? JSON.parse(saved) : DEFAULT_BOOKMARKS);
  }, []);

  const save = (updated: Bookmark[]) => {
    setBookmarks(updated);
    localStorage.setItem('mc_bookmarks', JSON.stringify(updated));
  };

  const addBookmark = () => {
    if (!form.url.trim()) return;
    let url = form.url.trim();
    if (!url.startsWith('http')) url = 'https://' + url;

    const bookmark: Bookmark = {
      id: Date.now().toString(),
      name: form.name.trim() || getDomain(url),
      url,
      tags: form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    save([bookmark, ...bookmarks]);
    setForm({ name: '', url: '', tagsInput: '' });
    setIsModalOpen(false);
  };

  const deleteBookmark = (id: string) => save(bookmarks.filter((b) => b.id !== id));

  // Collect all unique tags
  const allTags = ['전체', ...Array.from(new Set(bookmarks.flatMap((b) => b.tags)))];

  const filtered =
    activeTag === '전체'
      ? bookmarks
      : bookmarks.filter((b) => b.tags.includes(activeTag));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🔖 북마크</h1>
        <p className="page-subtitle">유용한 링크들을 모아두는 나만의 보관함</p>
      </div>

      <div className="section-header">
        <span className="section-title">{filtered.length}개의 링크</span>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + 추가
        </button>
      </div>

      {/* Tag filters */}
      {allTags.length > 1 && (
        <div className="bookmark-filters">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`filter-tag ${activeTag === tag ? 'active' : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔖</div>
          <div className="empty-state-title">북마크가 없어요</div>
          <div className="empty-state-desc">유용한 링크를 추가해봐요!</div>
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((bm) => {
            const faviconUrl = getFaviconUrl(bm.url);
            return (
              <div key={bm.id} className="card">
                <button
                  className="card-delete-btn"
                  onClick={() => deleteBookmark(bm.id)}
                  title="삭제"
                >
                  ✕
                </button>
                <a href={bm.url} target="_blank" rel="noopener noreferrer" className="bookmark-card-link">
                  <div className="bookmark-card">
                    <div className="bookmark-favicon">
                      {faviconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={faviconUrl} alt="" width={20} height={20} />
                      ) : (
                        '🌐'
                      )}
                    </div>
                    <div className="bookmark-info">
                      <div className="bookmark-name">{bm.name}</div>
                      <div className="bookmark-url">{getDomain(bm.url)}</div>
                    </div>
                  </div>
                </a>
                {bm.tags.length > 0 && (
                  <div className="tags" style={{ marginTop: 14 }}>
                    {bm.tags.map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">북마크 추가</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">URL *</label>
              <input
                className="input"
                placeholder="https://example.com"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">이름 (선택)</label>
              <input
                className="input"
                placeholder="비워두면 도메인으로 자동 설정"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">태그 (쉼표로 구분)</label>
              <input
                className="input"
                placeholder="개발, 디자인, 도구"
                value={form.tagsInput}
                onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>취소</button>
              <button className="btn btn-primary" onClick={addBookmark}>추가하기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
