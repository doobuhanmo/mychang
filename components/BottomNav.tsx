'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/',               icon: '🏠', label: '홈' },
  { href: '/projects',       icon: '🚀', label: '프로젝트' },
  { href: '/notes',          icon: '📝', label: '메모' },
  { href: '/bookmarks',      icon: '🔖', label: '북마크' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span className="bottom-nav-icon">{tab.icon}</span>
            <span className="bottom-nav-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
