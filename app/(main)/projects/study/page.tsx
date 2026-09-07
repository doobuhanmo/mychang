'use client';

import { useEffect, useRef, useState } from 'react';

const TOTAL = 100;
const BASE_URL = 'https://marketing.gilbut.co.kr/qr/eztok/book/301083';
const tracks = Array.from({ length: TOTAL }, (_, i) => {
  const n = String(i + 1).padStart(3, '0');
  return { id: i + 1, label: `Study ${n}`, src: `${BASE_URL}/Study${n}.mp3` };
});

const SPEEDS = [0.8, 1, 1.2, 1.5, 1.8, 2];

export default function StudyPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  // 트랙 변경 시 재생해야 하는지 ref로 추적 (stale closure 방지)
  const shouldPlayRef = useRef(false);
  const speedRef = useRef(1);


  const track = tracks[currentIdx];

  // 트랙 변경 시 src 교체 + 필요하면 자동 재생
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.src;
    audio.volume = volume;
    audio.playbackRate = speedRef.current;
    setProgress(0);
    setDuration(0);
    if (shouldPlayRef.current) {
      audio.play().catch(() => setIsPlaying(false));
    }
    // 선택된 트랙으로 스크롤
    const el = listRef.current?.querySelector(`[data-idx="${currentIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);


  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      shouldPlayRef.current = false;
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      shouldPlayRef.current = true;
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    shouldPlayRef.current = isPlaying;
    setCurrentIdx((i) => Math.max(0, i - 1));
  };
  const handleNext = () => {
    shouldPlayRef.current = isPlaying;
    setCurrentIdx((i) => Math.min(TOTAL - 1, i + 1));
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);
  };

  const handleEnded = () => {
    if (currentIdx < TOTAL - 1) {
      shouldPlayRef.current = true;
      setCurrentIdx((i) => i + 1);
      setIsPlaying(true);
    } else {
      shouldPlayRef.current = false;
      setIsPlaying(false);
    }
  };


  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setProgress(val);
    if (audioRef.current) audioRef.current.currentTime = val;
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  };

  const handleSpeed = (val: number) => {
    speedRef.current = val;
    setSpeed(val);
    if (audioRef.current) audioRef.current.playbackRate = val;
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🎧 영어 공부</h1>
        <p className="page-subtitle">길벗 이지톡 — 음원 파일 {TOTAL}개</p>
      </div>

      <div className="study-layout">
        {/* 트랙 목록 */}
        <div className="study-tracklist" ref={listRef}>
          {tracks.map((t, i) => (
            <button
              key={t.id}
              data-idx={i}
              className={`study-track-item ${i === currentIdx ? 'active' : ''}`}
              onClick={() => {
                shouldPlayRef.current = true;
                setCurrentIdx(i);
                setIsPlaying(true);

              }}
            >
              <span className="study-track-num">{t.id}</span>
              <span className="study-track-label">{t.label}</span>
              {i === currentIdx && isPlaying && <span className="study-track-playing">▶</span>}
            </button>
          ))}
        </div>

        {/* 플레이어 패널 */}
        <div className="study-player">
          <div className="study-now-playing">
            <div className="study-disc">{isPlaying ? '🔊' : '🎧'}</div>
            <div className="study-track-info">
              <div className="study-track-title">{track.label}</div>
              <div className="study-track-sub">길벗 이지톡</div>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="study-progress-wrap">
            <span className="study-time">{fmt(progress)}</span>
            <input
              type="range"
              className="study-range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={handleSeek}
            />
            <span className="study-time">{fmt(duration)}</span>
          </div>

          {/* 컨트롤 */}
          <div className="study-controls">
            <button
              className="study-ctrl-btn"
              onClick={handlePrev}
              disabled={currentIdx === 0}
              title="이전"
            >⏮</button>
            <button
              className="study-ctrl-btn study-ctrl-main"
              onClick={handlePlayPause}
              title={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              className="study-ctrl-btn"
              onClick={handleNext}
              disabled={currentIdx === TOTAL - 1}
              title="다음"
            >⏭</button>
          </div>

          {/* 배속 */}
          <div className="study-speed-wrap">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`study-speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => handleSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* 볼륨 */}
          <div className="study-volume-wrap">
            <span className="study-vol-icon">{volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
            <input
              type="range"
              className="study-range study-volume-range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
            />
          </div>

          {/* 트랙 카운터 */}
          <div className="study-counter">
            {currentIdx + 1} / {TOTAL}
          </div>
        </div>
      </div>

      {/* hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </>
  );
}
