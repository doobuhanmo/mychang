'use client';

import { useEffect, useState } from 'react';
import styles from './rlux.module.css';

type Product = { id: string; name: string; imageUrl: string; productUrl: string; regularPrice: number; currentPrice: number };

const STORAGE_KEY = 'rlux-discount-threshold';
const won = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

function discountRate(product: Product) {
  return Math.round(((product.regularPrice - product.currentPrice) / product.regularPrice) * 100);
}

export default function RluxPriceFinderPage() {
  const [threshold, setThreshold] = useState(40);
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState('할인율을 설정한 뒤 상품 확인을 눌러주세요.');
  const [detail, setDetail] = useState('R.LUX 전용 필터 결과만 확인합니다.');
  const [isLoading, setIsLoading] = useState(false);
  const [sourceJson, setSourceJson] = useState('');

  useEffect(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved >= 1 && saved <= 99) setThreshold(saved);
  }, []);

  const showResults = (source: Product[], validThreshold: number, savedCount?: number) => {
    const matched = source
      .filter((product) => discountRate(product) >= validThreshold)
      .sort((a, b) => discountRate(b) - discountRate(a));

    if (!matched.length) {
      setStatus('현재 설정한 할인율 이상의 상품이 없습니다.');
      setDetail(`로컬 DB에서 ${source.length}개를 확인했습니다.`);
      return;
    }

    setProducts(matched);
    setStatus(`현재 조건: ${validThreshold}% 이상 할인`);
    setDetail(`발견 상품: ${matched.length}개 · DB 저장 상품: ${source.length}개${savedCount === undefined ? '' : ` · 이번 저장: ${savedCount}개`}`);
  };

  const search = async () => {
    const validThreshold = Math.min(99, Math.max(1, Math.round(threshold || 40)));
    setThreshold(validThreshold);
    localStorage.setItem(STORAGE_KEY, String(validThreshold));
    setProducts([]);
    setIsLoading(true);
    setStatus('저장된 상품을 확인하는 중입니다…');
    setDetail('로컬 SQLite DB에서 R.LUX 상품을 검색하고 있어요.');

    try {
      const response = await fetch('/api/rlux-products', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || '상품을 불러오지 못했습니다.');

      showResults(data.products as Product[], validThreshold);
    } catch (error) {
      setStatus('상품을 불러오지 못했습니다.');
      setDetail(error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const importProducts = async () => {
    const validThreshold = Math.min(99, Math.max(1, Math.round(threshold || 40)));
    let payload: unknown;
    try {
      payload = JSON.parse(sourceJson);
    } catch {
      setStatus('붙여넣은 JSON 형식이 올바르지 않습니다.');
      setDetail('상품 배열 또는 { "products": [...] } 형식으로 붙여넣으세요.');
      return;
    }

    setIsLoading(true);
    setProducts([]);
    setStatus('상품 데이터를 저장하는 중입니다…');
    setDetail('입력한 데이터를 로컬 SQLite DB에 저장하고 있어요.');
    try {
      const response = await fetch('/api/rlux-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || '상품 데이터를 저장하지 못했습니다.');
      showResults(data.products as Product[], validThreshold, data.saved);
    } catch (error) {
      setStatus('상품 데이터를 저장하지 못했습니다.');
      setDetail(error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p>R.LUX PRICE FINDER</p>
        <h1>R.LUX 할인상품 찾기</h1>
        <span>현재 공개된 R.LUX 목록에서 원하는 할인율 이상의 상품을 찾아요.</span>
      </header>

      <section className={styles.control}>
        <label htmlFor="threshold">할인율 기준</label>
        <div className={styles.inputRow}>
          <input id="threshold" type="number" inputMode="numeric" min="1" max="99" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} />
          <strong>%</strong>
        </div>
        <p>정상가와 현재가로 직접 계산합니다.</p>
        <button type="button" onClick={search} disabled={isLoading}>{isLoading ? '처리 중…' : '저장된 상품 검색'}</button>
      </section>

      <section className={styles.manual}>
        <label htmlFor="source-json">R.LUX 상품 JSON 붙여넣기</label>
        <p>R.LUX 페이지에서 직접 추출한 상품 배열을 붙여넣으세요. 필수 값: 상품명, 링크, 현재가, 정상가.</p>
        <textarea id="source-json" value={sourceJson} onChange={(event) => setSourceJson(event.target.value)} placeholder={'[{"name":"상품명", "productUrl":"https://www.coupang.com/vp/products/...", "currentPrice":120000, "originalPrice":200000}]'} />
        <button type="button" onClick={importProducts} disabled={isLoading || !sourceJson.trim()}>{isLoading ? '처리 중…' : 'DB에 저장하고 검색'}</button>
      </section>

      <section className={styles.status} aria-live="polite">
        <h2>{status}</h2>
        <p>{detail}</p>
      </section>

      <section className={styles.results} aria-live="polite">
        {products.map((product) => (
          <article className={styles.card} key={product.id}>
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <div className={styles.imagePlaceholder}>R.LUX</div>}
            <div>
              <b>{discountRate(product)}% 할인</b>
              <h2>{product.name}</h2>
              <dl>
                <div><dt>정상가</dt><dd className={styles.regular}>{won.format(product.regularPrice)}</dd></div>
                <div><dt>현재가</dt><dd className={styles.current}>{won.format(product.currentPrice)}</dd></div>
              </dl>
              <a href={product.productUrl} target="_blank" rel="noreferrer">쿠팡에서 보기 ↗</a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
