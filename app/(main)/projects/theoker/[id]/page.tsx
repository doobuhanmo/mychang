'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Post {
  id: string;
  num: number;
  title: string;
  date: string;
  images: string[];
}

const TTS_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function extractParagraphs(html: string): string[] {
  if (typeof window === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes = doc.querySelectorAll('p, h3, h2, li');
  return Array.from(nodes)
    .map((el) => el.textContent?.trim() ?? '')
    .filter((t) => t.length > 1);
}

export default function TheokerPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [content, setContent] = useState('');
  const [post, setPost] = useState<Post | null>(null);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const router = useRouter();

  // TTS state
  const [paras, setParas] = useState<string[]>([]);
  const [paraIdx, setParaIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(speed);
  const paraIdxRef = useRef(paraIdx);
  const isPlayingRef = useRef(isPlaying);
  const parasRef = useRef(paras);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { paraIdxRef.current = paraIdx; }, [paraIdx]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { parasRef.current = paras; }, [paras]);

  useEffect(() => {
    fetch('/theoker/index.json')
      .then((r) => r.json())
      .then((posts: Post[]) => {
        setAllPosts(posts);
        setPost(posts.find((p) => p.id === id) ?? null);
      });
    fetch(`/theoker/${id}/content.html`)
      .then((r) => r.text())
      .then((html) => {
        setContent(html);
        setParas(extractParagraphs(html));
        setParaIdx(0);
        setIsPlaying(false);
        window.speechSynthesis?.cancel();
      });
  }, [id]);

  // Stop TTS on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const speakAt = useCallback((idx: number) => {
    const all = parasRef.current;
    if (idx >= all.length) {
      setIsPlaying(false);
      return;
    }
    const utt = new SpeechSynthesisUtterance(all[idx]);
    utt.lang = 'ko-KR';
    utt.rate = speedRef.current;
    utt.onend = () => {
      if (!isPlayingRef.current) return;
      const next = paraIdxRef.current + 1;
      setParaIdx(next);
      paraIdxRef.current = next;
      speakAt(next);
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }, []);

  const handlePlay = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      isPlayingRef.current = true;
      speakAt(paraIdx);
    }
  };

  const handlePrev = () => {
    const next = Math.max(0, paraIdx - 1);
    setParaIdx(next);
    if (isPlaying) speakAt(next);
  };

  const handleNext = () => {
    const next = Math.min(paras.length - 1, paraIdx + 1);
    setParaIdx(next);
    if (isPlaying) speakAt(next);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setParaIdx(0);
  };

  const handleSpeed = (s: number) => {
    setSpeed(s);
    speedRef.current = s;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setTimeout(() => speakAt(paraIdxRef.current), 50);
    }
  };

  const idx = allPosts.findIndex((p) => p.id === id);
  const prev = idx > 0 ? allPosts[idx - 1] : null;
  const next = idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null;

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* 목록으로 가기 */}
      <Link
        href="/projects/theoker"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', marginBottom: 16 }}
      >
        ← 목록으로
      </Link>

      {/* 헤더 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{post?.date}</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3, letterSpacing: '-0.5px' }}>
          {post?.title}
        </h1>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '20px 0' }} />

      {/* 본문 */}
      <div className="theoker-content" dangerouslySetInnerHTML={{ __html: content }} />


      {/* 이전/다음 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
        {prev && (
          <button
            onClick={() => { handleStop(); router.push(`/projects/theoker/${prev.id}`); }}
            className="card"
            style={{ flex: 1, cursor: 'pointer', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'var(--bg-surface)' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>← 이전</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              {prev.title}
            </div>
          </button>
        )}
        {next && (
          <button
            onClick={() => { handleStop(); router.push(`/projects/theoker/${next.id}`); }}
            className="card"
            style={{ flex: 1, cursor: 'pointer', padding: '12px 16px', textAlign: 'right', border: 'none', background: 'var(--bg-surface)' }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>다음 →</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              {next.title}
            </div>
          </button>
        )}
      </div>

      {/* TTS 플레이어 바 */}
      {paras.length > 0 && (
        <div className="tts-player-bar">
          <div className="tts-bar-track">
            <span className="tts-bar-icon">{isPlaying ? '🔊' : '📖'}</span>
            <span className="tts-bar-text">{paras[paraIdx] ?? ''}</span>
            <span className="tts-bar-progress">{paraIdx + 1} / {paras.length}</span>
          </div>
          <div className="tts-bar-controls">
            <button className="tts-btn" onClick={handlePrev} disabled={paraIdx === 0} title="이전 문단">⏮</button>
            <button className="tts-btn tts-btn-main" onClick={handlePlay} title={isPlaying ? '일시정지' : '재생'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="tts-btn" onClick={handleNext} disabled={paraIdx >= paras.length - 1} title="다음 문단">⏭</button>
            <button className="tts-btn" onClick={handleStop} title="정지">⏹</button>
            <div className="tts-speed-group">
              {TTS_SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`tts-speed-btn ${speed === s ? 'active' : ''}`}
                  onClick={() => handleSpeed(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
