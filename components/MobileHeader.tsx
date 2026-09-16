'use client';

import { usePathname, useRouter } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/':               'mychang',
  '/projects':       '🚀 프로젝트',
  '/projects/study': '🎧 영어 공부',
  '/hongdae':        '🍜 홍대 맛집 지도',
  '/notes':          '📝 메모 & 할일',
  '/bookmarks':      '🔖 북마크',
};

function getParent(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return '/';
  return '/' + parts.slice(0, -1).join('/');
}

export default function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = PAGE_TITLES[pathname] ?? 'mychang';
  const parent = getParent(pathname);

  return (
    <header className="mobile-header">
      <div className="mobile-header-left">
        {parent !== null ? (
          <button
            className="mobile-back-btn"
            onClick={() => router.push(parent)}
            aria-label="뒤로"
          >
            ‹
          </button>
        ) : (
          <span className="mobile-logo">✦</span>
        )}
      </div>
      <span className="mobile-header-title">{title}</span>
      <div className="mobile-header-right" />
    </header>
  );
}
