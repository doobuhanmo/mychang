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
}

export default function TheokerListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState('');

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

      {query && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
          {filtered.length}개 결과
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((post) => (
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
        ))}
      </div>
    </div>
  );
}
