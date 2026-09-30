import Link from 'next/link';

export default function TemporaryProjectsPage() {
  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1 className="page-title">📂 임시</h1>
        <p className="page-subtitle">정리 전인 프로젝트를 모아둔 곳이에요.</p>
      </div>
      <Link href="/projects/temp/rlux-price-finder" className="card" style={{ display: 'block', padding: 24, textDecoration: 'none', color: 'inherit' }}>
        <div className="card-title"><span>🛍️</span>R.LUX 할인상품 찾기</div>
        <p className="card-desc" style={{ marginTop: 8 }}>직접 붙여넣은 R.LUX 상품 JSON을 로컬 DB에 저장하고 할인율로 검색합니다.</p>
        <div className="tags" style={{ marginTop: 14 }}><span className="tag">Python</span><span className="tag">SQLite</span><span className="tag">Next.js</span></div>
      </Link>
    </div>
  );
}
