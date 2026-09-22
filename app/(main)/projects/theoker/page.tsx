'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Post {
  id: string;
  num: number;
  title: string;
  date: string;
  images: string[];
}

export default function TheokerListPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/theoker/index.json')
      .then((r) => r.json())
      .then(setPosts);
  }, []);

  const filtered = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      String(p.num).includes(query)
  );

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📈 더커 투자철학</h2>
      </div>
      <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>
        총 {posts.length}개 포스팅
      </p>

      {/* 검색 */}
      <input
        className="search-input"
        placeholder="제목 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((post) => (
          <Link
            key={post.id}
            href={`/projects/theoker/${post.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="card"
              style={{ cursor: 'pointer', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <span
                style={{
                  minWidth: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {post.num || '서'}
              </span>
              <div style={{ flex: 1 }}>
                <div className="card-title" style={{ marginBottom: 2 }}>{post.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{post.date}</div>
              </div>
              {post.images.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>🖼️</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
