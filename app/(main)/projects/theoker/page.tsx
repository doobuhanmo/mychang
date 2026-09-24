'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Post {
  id: string;
  num: number;
  title: string;
  date: string;
  images: string[];
  excerpt: string;
  chapter?: number;
}

type ViewMode = 'all' | 'grouped';

function getGroup(post: Post) {
  const { title } = post;
  const titleWithoutPostNumber = title.replace(/^\d+\.\s*/, '');
  if (titleWithoutPostNumber.startsWith('차트 분석') || /^\(지지와 저항 \d+\)/.test(titleWithoutPostNumber)) {
    return { key: 'chart-analysis', title: '7. 차트 분석' };
  }

  const chapterMatch = title.match(/\s+(\d{1,2})-\d+\s*$/);
  const normalizedTitle = titleWithoutPostNumber
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s*[①-⑳]\s*$/, '')
    .replace(/\s+\d{1,2}-\d+\s*$/, '')
    .trim();

  if (post.chapter) {
    return { key: `chapter-${post.chapter}`, title: `${post.chapter}. ${normalizedTitle}` };
  }

  if (chapterMatch) {
    return { key: `chapter-${chapterMatch[1]}`, title: `${chapterMatch[1]}. ${normalizedTitle}` };
  }

  return { key: normalizedTitle, title: normalizedTitle };
}

export default function TheokerListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/theoker/index.json')
      .then((r) => r.json())
      .then(setPosts);
  }, []);

  const q = query.toLowerCase();
  const filtered = q
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q)
      )
    : posts;

  const groups = filtered.reduce<{ key: string; title: string; posts: Post[] }[]>((result, post) => {
    const groupInfo = getGroup(post);
    const group = result.find((item) => item.key === groupInfo.key);
    if (group) group.posts.push(post);
    else result.push({ ...groupInfo, posts: [post] });
    return result;
  }, []);

  const renderPost = (post: Post) => (
    <Link
      key={post.id}
      href={`/projects/theoker/${post.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div className="theoker-row">
        <span className="theoker-num">{post.num || '서'}</span>
        <div className="theoker-row-info">
          <span className="theoker-row-title">{post.title}</span>
          <span className="theoker-row-date">{post.date}</span>
        </div>
        {post.images.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>🖼</span>}
      </div>
    </Link>
  );

  const toggleGroup = (title: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📈 더커 투자철학</h2>
      </div>
      <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 16 }}>
        총 {posts.length}개 포스팅
      </p>

      <input
        className="search-input"
        placeholder="제목 또는 내용 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setViewMode('all')}
          aria-pressed={viewMode === 'all'}
          style={{
            border: '1px solid var(--glass-border)', borderRadius: 8, padding: '7px 11px', cursor: 'pointer',
            background: viewMode === 'all' ? 'var(--accent)' : 'var(--bg-surface)',
            color: viewMode === 'all' ? '#fff' : 'var(--text-2)', fontSize: 12,
          }}
        >
          전체 보기
        </button>
        <button
          type="button"
          onClick={() => setViewMode('grouped')}
          aria-pressed={viewMode === 'grouped'}
          style={{
            border: '1px solid var(--glass-border)', borderRadius: 8, padding: '7px 11px', cursor: 'pointer',
            background: viewMode === 'grouped' ? 'var(--accent)' : 'var(--bg-surface)',
            color: viewMode === 'grouped' ? '#fff' : 'var(--text-2)', fontSize: 12,
          }}
        >
          제목별 묶기
        </button>
      </div>

      {query && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
          {filtered.length}개 결과
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {viewMode === 'all' ? filtered.map(renderPost) : groups.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          return (
            <section key={group.key} style={{ marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={isExpanded}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 10px',
                  border: '1px solid var(--glass-border)', borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                  cursor: 'pointer', background: 'var(--bg-surface)', color: 'var(--text-1)', textAlign: 'left',
                }}
              >
                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{isExpanded ? '▾' : '▸'}</span>
                <strong style={{ flex: 1, fontSize: 13 }}>{group.title}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{group.posts.length}개 글</span>
              </button>
              {isExpanded && (
                <div style={{ border: '1px solid var(--glass-border)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                  {group.posts.map(renderPost)}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
