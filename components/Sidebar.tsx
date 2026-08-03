'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: '🏠', label: '홈' },
  { href: '/projects', icon: '🚀', label: '프로젝트' },
  { href: '/notes', icon: '📝', label: '메모 & 할일' },
  { href: '/bookmarks', icon: '🔖', label: '북마크' },
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
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
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
