'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '좋은 아침이에요 ☀️';
  if (hour < 18) return '좋은 오후예요 🌤️';
  return '좋은 저녁이에요 🌙';
}

function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

const quickLinks = [
  { href: '/projects', icon: '🚀', label: '프로젝트', desc: '나의 작업물 모음' },
  { href: '/notes', icon: '📝', label: '메모 & 할일', desc: '생각과 할 것들' },
  { href: '/bookmarks', icon: '🔖', label: '북마크', desc: '유용한 링크 모음' },
];

export default function HomePage() {
  const [counts, setCounts] = useState({ projects: 0, notes: 0, todos: 0, bookmarks: 0 });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setNow(new Date());
    const projects = JSON.parse(localStorage.getItem('mc_projects') || '[]');
    const notes = JSON.parse(localStorage.getItem('mc_notes') || '[]');
    const todos = JSON.parse(localStorage.getItem('mc_todos') || '[]');
    const bookmarks = JSON.parse(localStorage.getItem('mc_bookmarks') || '[]');
    setCounts({
      projects: projects.length,
      notes: notes.length,
      todos: todos.filter((t: { done: boolean }) => !t.done).length,
      bookmarks: bookmarks.length,
    });
  }, []);

  return (
    <>
      {/* Greeting */}
      <div className="greeting-card">
        <div className="greeting-time">{formatDate(now)}</div>
        <div className="greeting-title">{getGreeting()}</div>
        <div className="greeting-sub">오늘도 뭔가 멋진 것들을 담아봐요 🎯</div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-value">{counts.projects}</div>
          <div className="stat-label">프로젝트</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{counts.todos}</div>
          <div className="stat-label">남은 할일</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔖</div>
          <div className="stat-value">{counts.bookmarks}</div>
          <div className="stat-label">북마크</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="section-header">
        <h2 className="section-title">바로가기</h2>
      </div>
      <div className="card-grid">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <div className="card-title">
                <span>{item.icon}</span>
                {item.label}
              </div>
              <div className="card-desc">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
