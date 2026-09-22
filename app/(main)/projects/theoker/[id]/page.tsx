'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  num: number;
  title: string;
  date: string;
  images: string[];
}

export default function TheokerPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [content, setContent] = useState('');
  const [post, setPost] = useState<Post | null>(null);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Load index for navigation
    fetch('/theoker/index.json')
      .then((r) => r.json())
      .then((posts: Post[]) => {
        setAllPosts(posts);
        const found = posts.find((p) => p.id === id);
        setPost(found ?? null);
      });

    // Load content
    fetch(`/theoker/${id}/content.html`)
      .then((r) => r.text())
      .then(setContent);
  }, [id]);

  const idx = allPosts.findIndex((p) => p.id === id);
  const prev = idx > 0 ? allPosts[idx - 1] : null;
  const next = idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null;

  return (
    <div>
      {/* 헤더 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{post?.date}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3, letterSpacing: '-0.5px' }}>
          {post?.num ? `${post.num}. ` : ''}{post?.title}
        </h1>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '20px 0' }} />

      {/* 본문 */}
      <div
        className="theoker-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* 이전/다음 네비게이션 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
        {prev && (
          <button
            onClick={() => router.push(`/projects/theoker/${prev.id}`)}
            className="card"
            style={{ flex: 1, cursor: 'pointer', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'var(--bg-surface)' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>← 이전</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              {prev.num ? `${prev.num}. ` : ''}{prev.title}
            </div>
          </button>
        )}
        {next && (
          <button
            onClick={() => router.push(`/projects/theoker/${next.id}`)}
            className="card"
            style={{ flex: 1, cursor: 'pointer', padding: '12px 16px', textAlign: 'right', border: 'none', background: 'var(--bg-surface)' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>다음 →</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              {next.num ? `${next.num}. ` : ''}{next.title}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
