'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/', icon: '🏠', label: '홈', sub: [] },
  {
    href: '/projects',
    icon: '🚀',
    label: '프로젝트',
    sub: [
      { href: '/hongdae', icon: '🍜', label: '홍대 맛집 지도' },
      { href: '/projects/study', icon: '🎧', label: '영어 공부' },
      { href: '/projects/theoker', icon: '📈', label: '더커 투자철학' },
    ],
  },
  { href: '/notes', icon: '📝', label: '메모 & 할일', sub: [] },
  { href: '/bookmarks', icon: '🔖', label: '북마크', sub: [] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  const toggleSub = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenSubs((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* 로고 + 접기 버튼 */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">✦</div>
          {!collapsed && <span className="sidebar-logo-text">mychang</span>}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {!collapsed && <span className="nav-label">메뉴</span>}

          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            const hasSub = !collapsed && item.sub && item.sub.length > 0;
            const isOpen = isActive || !!openSubs[item.href];

            return (
              <div key={item.href}>
                {collapsed ? (
                  /* 접힌 상태: 아이콘만 */
                  <Link
                    href={item.href}
                    className={`nav-item nav-item-icon-only ${isActive ? 'active' : ''}`}
                    title={item.label}
                  >
                    <span className="nav-icon">{item.icon}</span>
                  </Link>
                ) : (
                  /* 펼쳐진 상태: 텍스트 + 서브메뉴 토글 */
                  <div className="nav-item-row">
                    <Link
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {item.label}
                    </Link>
                    {hasSub && (
                      <button
                        className="nav-sub-toggle"
                        onClick={(e) => toggleSub(item.href, e)}
                        title={isOpen ? '접기' : '펼치기'}
                      >
                        {isOpen ? '▾' : '▸'}
                      </button>
                    )}
                  </div>
                )}

                {hasSub && isOpen && (
                  <div className="nav-sub">
                    {item.sub.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`nav-item nav-sub-item ${
                          pathname === sub.href || pathname.startsWith(sub.href + '/')
                            ? 'active'
                            : ''
                        }`}
                      >
                        <span className="nav-icon" style={{ fontSize: 12 }}>{sub.icon}</span>
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="sidebar-footer">
            <div>나의 공간 ✦</div>
            <div style={{ marginTop: 4, fontSize: 11 }}>
              {new Date().getFullYear()}
            </div>
          </div>
        )}
      </aside>

      {/* 본문이 사이드바 너비를 인식하도록 CSS 변수 주입 */}
      <style>{`
        :root {
          --sidebar-w: ${collapsed ? '64px' : '232px'};
        }
      `}</style>
    </>
  );
}
