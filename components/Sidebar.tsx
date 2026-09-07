'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: '🏠', label: '홈', sub: [] },
  {
    href: '/projects',
    icon: '🚀',
    label: '프로젝트',
    sub: [
      { href: '/hongdae', icon: '🍜', label: '홍대 맛집 지도' },
      { href: '/projects/study', icon: '🎧', label: '영어 공부' },
    ],
  },
  { href: '/notes', icon: '📝', label: '메모 & 할일', sub: [] },
  { href: '/bookmarks', icon: '🔖', label: '북마크', sub: [] },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">✦</div>
        <span className="sidebar-logo-text">mychang</span>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-label">메뉴</span>
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
              {isActive && item.sub && item.sub.length > 0 && (
                <div className="nav-sub">
                  {item.sub.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`nav-item nav-sub-item ${pathname === sub.href || pathname.startsWith(sub.href + '/') ? 'active' : ''}`}
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


      <div className="sidebar-footer">
        <div>나의 공간 ✦</div>
        <div style={{ marginTop: 4, fontSize: 11 }}>
          {new Date().getFullYear()}
        </div>
      </div>
    </aside>
  );
}
