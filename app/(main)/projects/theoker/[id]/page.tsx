'use client';

import { useState, useEffect, use, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Post,
  PlayScope,
  getGroup,
  getGroupPosts,
  getNextPost,
  getPrevPost,
} from '@/lib/theoker';

const TTS_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

const SCOPE_CONFIG: Record<PlayScope, { label: string; icon: string; title: string }> = {
  single: { label: '단일 글', icon: '📄', title: '현재 게시물만 재생' },
  group:  { label: '그룹 재생', icon: '📑', title: '같은 묶음(그룹) 글 연속 재생' },
  all:    { label: '전체 재생', icon: '🔁', title: '전체 글 순서대로 연속 재생' },
};

function extractParagraphs(html: string): string[] {
  if (typeof window === 'undefined') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes = doc.querySelectorAll('p, h3, h2, li');
  return Array.from(nodes)
    .map((el) => el.textContent?.trim() ?? '')
    .filter((t) => t.length > 1);
}

function TheokerPostDetail({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [content, setContent] = useState('');
  const [post, setPost] = useState<Post | null>(null);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // 재생 모드 (단일 / 그룹 / 전체)
  const qScope = searchParams.get('scope') as PlayScope | null;
  const [scope, setScope] = useState<PlayScope>(() => {
    if (qScope && ['single', 'group', 'all'].includes(qScope)) return qScope;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theoker_play_scope') as PlayScope | null;
      if (saved && ['single', 'group', 'all'].includes(saved)) return saved;
    }
    return 'group';
  });
  const scopeRef = useRef(scope);

  // TTS 상태
  const [paras, setParas] = useState<string[]>([]);
  const [paraIdx, setParaIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const speedRef = useRef(speed);
  const paraIdxRef = useRef(paraIdx);
  const isPlayingRef = useRef(isPlaying);
  const parasRef = useRef(paras);
  const postRef = useRef(post);
  const allPostsRef = useRef(allPosts);
  const speakAtRef = useRef<(idx: number) => void>(() => {});

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { paraIdxRef.current = paraIdx; }, [paraIdx]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { parasRef.current = paras; }, [paras]);
  useEffect(() => { postRef.current = post; }, [post]);
  useEffect(() => { allPostsRef.current = allPosts; }, [allPosts]);
  useEffect(() => { scopeRef.current = scope; }, [scope]);

  // 게시물 & 본문 로드
  useEffect(() => {
    const isAutoplay = searchParams.get('autoplay') === '1';

    fetch('/theoker/index.json')
      .then((r) => r.json())
      .then((posts: Post[]) => {
        setAllPosts(posts);
        const cur = posts.find((p) => p.id === id) ?? null;
        setPost(cur);
      });

    fetch(`/theoker/${id}/content.html`)
      .then((r) => r.text())
      .then((html) => {
        setContent(html);
        const extracted = extractParagraphs(html);
        setParas(extracted);
        setParaIdx(0);
        paraIdxRef.current = 0;

        if (isAutoplay && extracted.length > 0) {
          setIsPlaying(true);
          isPlayingRef.current = true;
          setTimeout(() => {
            speakAtRef.current(0);
          }, 100);
        } else {
          setIsPlaying(false);
          isPlayingRef.current = false;
          window.speechSynthesis?.cancel();
        }
      });
  }, [id, searchParams]);

  // 언마운트 시 TTS 중지
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // 음성 낭독 함수
  const speakAt = useCallback((idx: number) => {
    const all = parasRef.current;
    if (idx >= all.length) {
      // 현재 글의 모든 문단 낭독 완료
      const currentScope = scopeRef.current;
      const currentPost = postRef.current;
      const postsList = allPostsRef.current;

      if (currentScope === 'single' || !currentPost) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        return;
      }

      const next = getNextPost(postsList, currentPost, currentScope);
      if (next) {
        window.speechSynthesis?.cancel();
        setIsPlaying(false);
        isPlayingRef.current = false;
        router.push(`/projects/theoker/${next.id}?autoplay=1&scope=${currentScope}`);
      } else {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
      return;
    }

    const utt = new SpeechSynthesisUtterance(all[idx]);
    utt.lang = 'ko-KR';
    utt.rate = speedRef.current;
    utt.onend = () => {
      if (!isPlayingRef.current) return;
      const nextIdx = paraIdxRef.current + 1;
      setParaIdx(nextIdx);
      paraIdxRef.current = nextIdx;
      speakAtRef.current(nextIdx);
    };
    utt.onerror = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }, [router]);

  useEffect(() => {
    speakAtRef.current = speakAt;
  }, [speakAt]);

  // 본문 문단 하이라이팅 및 클릭 시 해당 문단부터 재생
  useEffect(() => {
    if (!contentRef.current) return;
    const nodes = contentRef.current.querySelectorAll('p, h3, h2, li');
    const validNodes: HTMLElement[] = [];
    nodes.forEach((node) => {
      if ((node.textContent?.trim().length ?? 0) > 1) {
        validNodes.push(node as HTMLElement);
      }
    });

    validNodes.forEach((node, i) => {
      if (i === paraIdx) {
        node.classList.add('theoker-para-highlight');
        if (isPlayingRef.current) {
          node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        node.classList.remove('theoker-para-highlight');
      }

      node.onclick = () => {
        setParaIdx(i);
        paraIdxRef.current = i;
        speakAtRef.current(i);
        setIsPlaying(true);
        isPlayingRef.current = true;
      };
    });
  }, [paraIdx, isPlaying, content]);

  const handlePlay = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      setIsPlaying(true);
      isPlayingRef.current = true;
      speakAt(paraIdx);
    }
  };

  const handlePrev = () => {
    if (paraIdx > 0) {
      const next = paraIdx - 1;
      setParaIdx(next);
      paraIdxRef.current = next;
      if (isPlaying) speakAt(next);
    } else if (scope !== 'single' && post) {
      const prevPost = getPrevPost(allPosts, post, scope);
      if (prevPost) {
        window.speechSynthesis?.cancel();
        setIsPlaying(false);
        isPlayingRef.current = false;
        router.push(`/projects/theoker/${prevPost.id}?autoplay=${isPlaying ? '1' : '0'}&scope=${scope}`);
      }
    }
  };

  const handleNext = () => {
    if (paraIdx < paras.length - 1) {
      const next = paraIdx + 1;
      setParaIdx(next);
      paraIdxRef.current = next;
      if (isPlaying) speakAt(next);
    } else if (scope !== 'single' && post) {
      const nextPost = getNextPost(allPosts, post, scope);
      if (nextPost) {
        window.speechSynthesis?.cancel();
        setIsPlaying(false);
        isPlayingRef.current = false;
        router.push(`/projects/theoker/${nextPost.id}?autoplay=${isPlaying ? '1' : '0'}&scope=${scope}`);
      }
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setParaIdx(0);
    paraIdxRef.current = 0;
  };

  const handleSpeed = (s: number) => {
    setSpeed(s);
    speedRef.current = s;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setTimeout(() => speakAt(paraIdxRef.current), 50);
    }
  };

  const handleSeek = (next: number) => {
    setParaIdx(next);
    paraIdxRef.current = next;
    if (isPlaying) speakAt(next);
  };

  const handleScopeChange = (nextScope: PlayScope) => {
    setScope(nextScope);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theoker_play_scope', nextScope);
    }
  };

  // 그룹 및 전체 진행 정보 계산
  const groupInfo = post ? getGroup(post) : { key: '', title: '' };
  const groupPosts = post ? getGroupPosts(allPosts, post) : [];
  const postIdxInGroup = post ? groupPosts.findIndex((p) => p.id === post.id) : -1;
  const postIdxInAll = post ? allPosts.findIndex((p) => p.id === post.id) : -1;

  const prevArticle = postIdxInAll > 0 ? allPosts[postIdxInAll - 1] : null;
  const nextArticle = postIdxInAll >= 0 && postIdxInAll < allPosts.length - 1 ? allPosts[postIdxInAll + 1] : null;

  const progressPct = paras.length > 1 ? (paraIdx / (paras.length - 1)) * 100 : 0;

  // 서브타이틀 생성 (재생 모드별 위치 & 문단 진행도 표시)
  let subText = `단일 재생 · 문단 ${paraIdx + 1} / ${paras.length}`;
  if (scope === 'group' && groupPosts.length > 0) {
    subText = `${groupInfo.title} (${postIdxInGroup + 1}/${groupPosts.length}번째 글) · 문단 ${paraIdx + 1}/${paras.length}`;
  } else if (scope === 'all' && allPosts.length > 0) {
    subText = `전체 재생 (${postIdxInAll + 1}/${allPosts.length}번째 글) · 문단 ${paraIdx + 1}/${paras.length}`;
  }

  return (
    <div style={{ paddingBottom: 130 }}>
      {/* 목록으로 가기 */}
      <Link
        href="/projects/theoker"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          color: 'var(--text-3)',
          textDecoration: 'none',
          marginBottom: 16,
        }}
        onClick={handleStop}
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

      {/* 본문 (문단 클릭 시 즉시 낭독 시작 및 하이라이트) */}
      <div ref={contentRef} className="theoker-content" dangerouslySetInnerHTML={{ __html: content }} />

      {/* 이전/다음 글 카드 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
        {prevArticle && (
          <button
            onClick={() => {
              handleStop();
              router.push(`/projects/theoker/${prevArticle.id}`);
            }}
            className="card"
            style={{
              flex: 1,
              cursor: 'pointer',
              padding: '12px 16px',
              textAlign: 'left',
              border: 'none',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>← 이전 글</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              {prevArticle.title}
            </div>
          </button>
        )}
        {nextArticle && (
          <button
            onClick={() => {
              handleStop();
              router.push(`/projects/theoker/${nextArticle.id}`);
            }}
            className="card"
            style={{
              flex: 1,
              cursor: 'pointer',
              padding: '12px 16px',
              textAlign: 'right',
              border: 'none',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>다음 글 →</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              {nextArticle.title}
            </div>
          </button>
        )}
      </div>

      {/* Theoker 전용 독립 하단 플레이어 바 */}
      {paras.length > 0 && (
        <div className="theoker-player-bar">
          <div className="theoker-player-main">
            {/* 데스크탑: 좌측 / 모바일: 상단 (목록 + 게시물 제목 + 재생범위 토글) */}
            <div className="theoker-player-row-top" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <Link
                href="/projects/theoker"
                className="spb-btn spb-list-toggle"
                title="목록으로"
                style={{ textDecoration: 'none' }}
                onClick={handleStop}
              >
                ☰
              </Link>

              <div className="theoker-player-track">
                <div className="spb-disc">{isPlaying ? '🔊' : '📖'}</div>
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <div className="theoker-player-title" title={post?.title}>
                    {post?.title || '더커 투자철학'}
                  </div>
                  <div className="theoker-player-sub" title={subText}>
                    {subText}
                  </div>
                </div>
              </div>

              {/* 재생 범위 (단일 글 / 그룹 / 전체) 선택 */}
              <div className="theoker-scope-pills" style={{ marginLeft: 'auto' }}>
                {(['single', 'group', 'all'] as PlayScope[]).map((s) => {
                  const cfg = SCOPE_CONFIG[s];
                  const isActive = scope === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`theoker-mode-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleScopeChange(s)}
                      title={cfg.title}
                    >
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 데스크탑: 우측 / 모바일: 하단 (재생 컨트롤 + 배속 스텝퍼) */}
            <div className="theoker-player-row-bottom" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div className="spb-controls">
                <button
                  className="spb-btn"
                  onClick={handlePrev}
                  disabled={paraIdx === 0 && (scope === 'single' || !getPrevPost(allPosts, post!, scope))}
                  title="이전 문단 / 이전 글"
                >
                  ⏮
                </button>
                <button
                  className="spb-btn spb-btn-main"
                  onClick={handlePlay}
                  title={isPlaying ? '일시정지' : '재생'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  className="spb-btn"
                  onClick={handleNext}
                  disabled={paraIdx >= paras.length - 1 && (scope === 'single' || !getNextPost(allPosts, post!, scope))}
                  title="다음 문단 / 다음 글"
                >
                  ⏭
                </button>
                <button className="spb-btn" onClick={handleStop} title="정지">
                  ⏹
                </button>
              </div>

              {/* 배속 스텝퍼 UI */}
              <div className="spb-speed-group">
                <button
                  type="button"
                  className="spb-speed-step"
                  onClick={() => {
                    const i = TTS_SPEEDS.indexOf(speed);
                    if (i > 0) handleSpeed(TTS_SPEEDS[i - 1]);
                  }}
                  disabled={TTS_SPEEDS.indexOf(speed) === 0}
                  title="배속 낮추기"
                >
                  −
                </button>
                <span
                  className="spb-speed-label"
                  onClick={() => {
                    const next = TTS_SPEEDS[(TTS_SPEEDS.indexOf(speed) + 1) % TTS_SPEEDS.length];
                    handleSpeed(next);
                  }}
                  style={{ cursor: 'pointer' }}
                  title="배속 변경"
                >
                  {speed}×
                </span>
                <button
                  type="button"
                  className="spb-speed-step"
                  onClick={() => {
                    const i = TTS_SPEEDS.indexOf(speed);
                    if (i < TTS_SPEEDS.length - 1) handleSpeed(TTS_SPEEDS[i + 1]);
                  }}
                  disabled={TTS_SPEEDS.indexOf(speed) === TTS_SPEEDS.length - 1}
                  title="배속 높이기"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 진행바 (문단 단위 슬라이더 탐색) */}
          <div className="spb-row-progress">
            <span className="spb-time">{paraIdx + 1}</span>
            <input
              type="range"
              className="spb-range"
              min={0}
              max={Math.max(0, paras.length - 1)}
              step={1}
              value={paraIdx}
              onChange={(e) => handleSeek(Number(e.target.value))}
              style={{ '--pct': `${progressPct}%` } as React.CSSProperties}
            />
            <span className="spb-time">{paras.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TheokerPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-3)' }}>로딩 중...</div>}>
      <TheokerPostDetail id={id} />
    </Suspense>
  );
}
