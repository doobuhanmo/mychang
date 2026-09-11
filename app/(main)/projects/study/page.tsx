'use client';

import { useEffect, useRef, useState } from 'react';

/* ──────────────────────────────────────────
   트랙 데이터
────────────────────────────────────────── */
const TOTAL = 100;
const BASE_URL = 'https://marketing.gilbut.co.kr/qr/eztok/book/301083';
const tracks = Array.from({ length: TOTAL }, (_, i) => {
  const n = String(i + 1).padStart(3, '0');
  return {
    id: i + 1,
    label: `Study ${n}`,
    src: `${BASE_URL}/Study${n}.mp3`,
    srt: `/scripts/Study${n}.srt`,
    txt: `/scripts/Study${n}.txt`,
  };
});

const SPEEDS = [0.8, 1, 1.2, 1.5, 1.8, 2];

/* ──────────────────────────────────────────
   SRT 파서
────────────────────────────────────────── */
interface SRTCue { kind: 'srt'; id: number; start: number; end: number; text: string; }

function parseTime(t: string): number {
  const [h, m, rest] = t.trim().split(':');
  const [s, ms] = rest.split(',');
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
}

function parseSRT(raw: string): SRTCue[] {
  return raw.trim().split(/\n\s*\n/).map((block) => {
    const lines = block.trim().split('\n');
    if (lines.length < 3) return null;
    const id = parseInt(lines[0]);
    const timeParts = lines[1].split('-->');
    if (timeParts.length !== 2) return null;
    return { kind: 'srt' as const, id, start: parseTime(timeParts[0]), end: parseTime(timeParts[1]), text: lines.slice(2).join(' ').trim() };
  }).filter((c): c is SRTCue => c !== null && !isNaN(c.id));
}

/* ──────────────────────────────────────────
   TXT 파서
────────────────────────────────────────── */
interface DialogueLine { speaker: 'A' | 'B' | null; text: string; }
interface TXTBlock { kind: 'txt'; expression: string; startTime?: number; lines: DialogueLine[]; }

function parseTXT(raw: string): TXTBlock[] {
  const results: TXTBlock[] = [];
  for (const block of raw.trim().split(/\n\s*\n/)) {
    const rows = block.trim().split('\n').filter(Boolean);
    if (rows.length === 0) continue;
    let expression = rows[0];
    let startTime: number | undefined;
    const tsMatch = rows[0].match(/^\[(\d+):(\d{2})\]\s*(.*)/);
    if (tsMatch) { startTime = parseInt(tsMatch[1]) * 60 + parseInt(tsMatch[2]); expression = tsMatch[3]; }
    const lines: DialogueLine[] = rows.slice(1).map((row) => {
      if (/^A:/i.test(row)) return { speaker: 'A' as const, text: row.replace(/^A:\s*/i, '') };
      if (/^B:/i.test(row)) return { speaker: 'B' as const, text: row.replace(/^B:\s*/i, '') };
      return { speaker: null, text: row };
    });
    results.push({ kind: 'txt', expression, startTime, lines });
  }
  return results;
}

type Script = { mode: 'srt'; cues: SRTCue[] } | { mode: 'txt'; blocks: TXTBlock[] } | { mode: 'none' };

/* ──────────────────────────────────────────
   메인 컴포넌트
────────────────────────────────────────── */
export default function StudyPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [script, setScript] = useState<Script>({ mode: 'none' });
  const [activeCue, setActiveCue] = useState(-1);
  const [activeBlock, setActiveBlock] = useState(-1);
  const [listOpen, setListOpen] = useState(true);

  // localStorage에서 초기값 복원
  const [selectedSet, setSelectedSet] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('study_selected');
      if (saved) return new Set(JSON.parse(saved) as number[]);
    } catch {}
    return new Set<number>();
  });
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'selected' | 'one'>(() => {
    try {
      const saved = localStorage.getItem('study_repeat') as 'none' | 'all' | 'selected' | 'one' | null;
      if (saved && ['none','all','selected','one'].includes(saved)) return saved;
    } catch {}
    return 'none';
  });


  const listRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);
  const shouldPlayRef = useRef(false);
  const speedRef = useRef(1);

  const track = tracks[currentIdx];

  /* selectedSet / repeatMode → localStorage 저장 */
  useEffect(() => {
    try { localStorage.setItem('study_selected', JSON.stringify([...selectedSet])); } catch {}
  }, [selectedSet]);
  useEffect(() => {
    try { localStorage.setItem('study_repeat', repeatMode); } catch {}
  }, [repeatMode]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.src;
    audio.volume = volume;
    audio.playbackRate = speedRef.current;
    setProgress(0); setDuration(0);
    setScript({ mode: 'none' }); setActiveCue(-1); setActiveBlock(-1);
    if (shouldPlayRef.current) audio.play().catch(() => setIsPlaying(false));

    // 트랙 목록 스크롤
    const el = listRef.current?.querySelector(`[data-idx="${currentIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // SRT → TXT 순서로 스크립트 로드
    fetch(track.srt)
      .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
      .then((raw) => { if (raw.includes('-->')) setScript({ mode: 'srt', cues: parseSRT(raw) }); else throw new Error(); })
      .catch(() =>
        fetch(track.txt)
          .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
          .then((raw) => setScript({ mode: 'txt', blocks: parseTXT(raw) }))
          .catch(() => setScript({ mode: 'none' }))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  /* 재생 위치 → 하이라이트 업데이트 (SRT: 타임스탬프 기반, TXT: 어림) */
  useEffect(() => {
    if (script.mode === 'srt') {
      const idx = script.cues.findIndex((c) => progress >= c.start && progress < c.end);
      setActiveCue(idx);
      if (idx >= 0) {
        const el = scriptRef.current?.querySelector(`[data-cue="${idx}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else if (script.mode === 'txt' && duration > 0) {
      const total = script.blocks.length;
      // 타임스탬프가 있는 블록은 정확하게, 없으면 균등 분할로 어림
      let idx = -1;
      const hasTimestamps = script.blocks.some((b) => b.startTime !== undefined);
      if (hasTimestamps) {
        // 타임스탬프 있는 블록: 현재 시간이 이 블록의 시작~다음 블록 시작 사이면 활성
        for (let i = total - 1; i >= 0; i--) {
          const st = script.blocks[i].startTime;
          if (st !== undefined && progress >= st) { idx = i; break; }
        }
      } else {
        // 균등 분할 어림
        idx = Math.min(Math.floor((progress / duration) * total), total - 1);
      }
      setActiveBlock(idx);
      if (idx >= 0) {
        const el = scriptRef.current?.querySelector(`[data-block="${idx}"]`) as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [progress, script, duration]);

  /* 핸들러 */
  const handlePlayPause = () => {
    const audio = audioRef.current; if (!audio) return;
    if (isPlaying) { audio.pause(); shouldPlayRef.current = false; setIsPlaying(false); }
    else { audio.play().catch(() => {}); shouldPlayRef.current = true; setIsPlaying(true); }
  };
  const handlePrev = () => { shouldPlayRef.current = isPlaying; setCurrentIdx((i) => Math.max(0, i - 1)); };
  const handleNext = () => { shouldPlayRef.current = isPlaying; setCurrentIdx((i) => Math.min(TOTAL - 1, i + 1)); };
  const handleTimeUpdate = () => {
    const audio = audioRef.current; if (!audio) return;
    setProgress(audio.currentTime); setDuration(audio.duration || 0);
  };
  const handleEnded = () => {
    const sorted = [...selectedSet].sort((a, b) => a - b);
    if (repeatMode === 'one') {
      // 한 곡 반복
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
      return;
    }
    if (repeatMode === 'selected' && sorted.length > 0) {
      // 선택된 곡들만 반복
      const pos = sorted.indexOf(currentIdx);
      const nextIdx = pos >= 0 && pos < sorted.length - 1 ? sorted[pos + 1] : sorted[0];
      shouldPlayRef.current = true; setCurrentIdx(nextIdx); setIsPlaying(true);
      return;
    }
    if (repeatMode === 'all') {
      // 전체 반복
      const next = currentIdx < TOTAL - 1 ? currentIdx + 1 : 0;
      shouldPlayRef.current = true; setCurrentIdx(next); setIsPlaying(true);
      return;
    }
    // none: 순서대로 끝까지
    if (currentIdx < TOTAL - 1) { shouldPlayRef.current = true; setCurrentIdx((i) => i + 1); setIsPlaying(true); }
    else { shouldPlayRef.current = false; setIsPlaying(false); }
  };

  const toggleSelect = (idx: number) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const cycleRepeat = () => {
    setRepeatMode((m) => m === 'none' ? 'all' : m === 'all' ? 'selected' : m === 'selected' ? 'one' : 'none');
  };

  const REPEAT_LABEL: Record<string, string> = { none: '🚫', all: '🔁', selected: '⭐', one: '🔂' };
  const REPEAT_TITLE: Record<string, string> = { none: '반복 없음', all: '전체 반복', selected: '선택 반복', one: '한 곡 반복' };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value); setProgress(val);
    if (audioRef.current) audioRef.current.currentTime = val;
  };
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value); setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  };
  const handleSpeed = (val: number) => {
    speedRef.current = val; setSpeed(val);
    if (audioRef.current) audioRef.current.playbackRate = val;
  };
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    handleSpeed(next);
  };
  const handleCueClick = (cue: SRTCue) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = cue.start; setProgress(cue.start);
    if (!isPlaying) { audioRef.current.play().catch(() => {}); shouldPlayRef.current = true; setIsPlaying(true); }
  };
  const handleExpressionClick = (block: TXTBlock, blockIdx: number, totalBlocks: number) => {
    if (!audioRef.current) return;
    const seekTo = block.startTime !== undefined
      ? block.startTime
      : (blockIdx / totalBlocks) * (duration || 0);
    audioRef.current.currentTime = seekTo; setProgress(seekTo);
    if (!isPlaying) { audioRef.current.play().catch(() => {}); shouldPlayRef.current = true; setIsPlaying(true); }
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  /* 스크립트 패널 */
  const renderScript = () => {
    if (script.mode === 'none') return (
      <div className="study-script-empty">
        <div className="empty-state-icon">📄</div>
        <div className="empty-state-title">스크립트 없음</div>
        <div className="empty-state-desc">
          <code>public/scripts/Study{String(currentIdx + 1).padStart(3, '0')}.txt</code>
        </div>
      </div>
    );
    if (script.mode === 'srt') return (
      <div className="study-script-list">
        {script.cues.map((cue, i) => (
          <button key={cue.id} data-cue={i}
            className={`study-cue-item ${i === activeCue ? 'active' : ''}`}
            onClick={() => handleCueClick(cue)}>
            <span className="study-cue-time">{fmt(cue.start)}</span>
            <span className="study-cue-text">{cue.text}</span>
          </button>
        ))}
      </div>
    );
    const totalBlocks = script.blocks.length;
    return (
      <div className="study-script-list">
        {script.blocks.map((block, bi) => (
          <div key={bi} data-block={bi} className={`study-txt-block ${bi === activeBlock ? 'active' : ''}`}>
            <button className="study-expression"
              onClick={() => handleExpressionClick(block, bi, totalBlocks)}
              title={block.startTime !== undefined ? `${fmt(block.startTime)}으로 이동` : '해당 위치로 이동 (어림)'}>
              <span className="study-expression-icon">▶</span>
              {block.expression}
            </button>
            {block.lines.map((line, li) => (
              <div key={li} className={`study-dialogue-line ${line.speaker === 'A' ? 'speaker-a' : line.speaker === 'B' ? 'speaker-b' : ''}`}>
                {line.speaker && <span className="study-speaker-badge">{line.speaker}</span>}
                <span className="study-dialogue-text">{line.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  /* 진행률 % (progress bar 배경용) */
  const pct = duration ? Math.round((progress / duration) * 100) : 0;

  return (
    <>
      {/* ── 상단 헤더 ── */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1 className="page-title">🎧 영어 공부</h1>
        <p className="page-subtitle">길벗 이지톡 — 음원 파일 {TOTAL}개</p>
      </div>

      {/* ── 본문: 트랙목록(접기 가능) + 스크립트 ── */}
      <div className="study-body">

        {/* 트랙 목록 패널 */}
        <div className={`study-list-panel ${listOpen ? 'open' : 'closed'}`}>
          <div className="study-list-inner" ref={listRef}>
            {tracks.map((t, i) => {
              const isSelected = selectedSet.has(i);
              return (
                <div key={t.id} data-idx={i} className={`study-track-row ${i === currentIdx ? 'active' : ''} ${isSelected ? 'selected' : ''}`}>
                  <button
                    className="study-track-play"
                    onClick={() => { shouldPlayRef.current = true; setCurrentIdx(i); setIsPlaying(true); }}
                  >
                    <span className="study-track-num">{t.id}</span>
                    <span className="study-track-label">{t.label}</span>
                    {i === currentIdx && isPlaying && <span className="study-track-playing">▶</span>}
                  </button>
                  <button
                    className={`study-track-check ${isSelected ? 'on' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(i); }}
                    title={isSelected ? '선택 해제' : '반복 목록에 추가'}
                  >{isSelected ? '✓' : '+'}</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 스크립트 패널 */}
        <div className="study-script-panel" ref={scriptRef}>
          {renderScript()}
        </div>
      </div>

      {/* ── 하단 고정 플레이어 바 ── */}
      <div className="study-player-bar">

        {/* 1행: 컨트롤 */}
        <div className="spb-row-main">

          {/* 목록 토글 */}
          <button
            className={`spb-btn spb-list-toggle ${listOpen ? 'active' : ''}`}
            onClick={() => setListOpen((v) => !v)}
            title={listOpen ? '목록 숨기기' : '목록 보기'}
          >☰</button>

          {/* 트랙 정보 */}
          <div className="spb-track">
            <div className="spb-disc">{isPlaying ? '🔊' : '🎧'}</div>
            <div className="spb-track-info">
              <div className="spb-track-name">{track.label}</div>
              <div className="spb-track-sub">{currentIdx + 1} / {TOTAL}</div>
            </div>
          </div>

          {/* 재생 컨트롤 */}
          <div className="spb-controls">
            <button className="spb-btn" onClick={handlePrev} disabled={currentIdx === 0} title="이전">⏮</button>
            <button className="spb-btn spb-btn-main" onClick={handlePlayPause} title={isPlaying ? '일시정지' : '재생'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="spb-btn" onClick={handleNext} disabled={currentIdx === TOTAL - 1} title="다음">⏭</button>
          </div>

          {/* 배속 + 반복 + 볼륨 */}
          <div className="spb-right">
            <div className="spb-speed-group">
              <button
                className="spb-speed-step"
                onClick={() => { const i = SPEEDS.indexOf(speed); if (i > 0) handleSpeed(SPEEDS[i - 1]); }}
                disabled={SPEEDS.indexOf(speed) === 0}
                title="배속 낮추기"
              >−</button>
              <span className="spb-speed-label">{speed}×</span>
              <button
                className="spb-speed-step"
                onClick={() => { const i = SPEEDS.indexOf(speed); if (i < SPEEDS.length - 1) handleSpeed(SPEEDS[i + 1]); }}
                disabled={SPEEDS.indexOf(speed) === SPEEDS.length - 1}
                title="배속 높이기"
              >+</button>
            </div>

            {/* 반복 모드 버튼 */}
            <button
              className={`spb-btn spb-repeat-btn ${repeatMode !== 'none' ? 'active' : ''}`}
              onClick={cycleRepeat}
              title={REPEAT_TITLE[repeatMode]}
            >
              <span>{REPEAT_LABEL[repeatMode]}</span>
              {repeatMode === 'selected' && selectedSet.size > 0 && (
                <span className="spb-repeat-badge">{selectedSet.size}</span>
              )}
            </button>

            <div className="spb-volume">
              <span className="spb-vol-icon" title={`볼륨 ${Math.round(volume * 100)}%`}>
                {volume === 0 ? '🔇' : volume < 0.4 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
              </span>
              <input
                type="range" className="spb-vol-range"
                min={0} max={1} step={0.01}
                value={volume} onChange={handleVolume}
              />
            </div>
          </div>
        </div>

        {/* 2행: 진행바 */}
        <div className="spb-row-progress">
          <span className="spb-time">{fmt(progress)}</span>
          <input
            type="range" className="spb-range"
            min={0} max={duration || 0} step={0.1}
            value={progress} onChange={handleSeek}
            style={{ '--pct': `${pct}%` } as React.CSSProperties}
          />
          <span className="spb-time">{fmt(duration)}</span>
        </div>

      </div>

      <audio ref={audioRef}
        onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate}
        onEnded={handleEnded} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
    </>
  );
}
