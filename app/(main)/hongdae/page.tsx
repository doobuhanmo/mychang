'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import NaverMap from './NaverMap';
import './hongdae.css';

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  emoji: string;
  desc: string;
  address: string;
  hours: string;
  price: string;
  rating: number;
  lat: number;
  lng: number;
  tip?: string;
}

const STORAGE_KEY = 'mc_hongdae_restaurants';

const DEFAULT_RESTAURANTS: Restaurant[] = [
  {
    id: '1', name: '연남동 경양식1920', category: '경양식 / 돈까스', emoji: '🍱',
    desc: '1920년대 감성으로 꾸며진 레트로 분위기의 경양식집. 두툼한 수제 돈까스와 진한 소스가 일품.',
    address: '서울 마포구 연남동', hours: '11:30 ~ 21:00 (월 휴무)', price: '₩15,000~20,000',
    rating: 4.6, lat: 37.5606, lng: 126.9244, tip: '점심엔 줄이 길어요. 2시~4시 사이가 조금 덜 붐벼요 👍',
  },
  {
    id: '2', name: '홍대 양꼬치 거리', category: '중식 / 양꼬치', emoji: '🔥',
    desc: '홍대 양꼬치 골목의 대표 맛집. 숯불 양꼬치에 칭따오 맥주 한 잔이면 완벽한 밤!',
    address: '서울 마포구 와우산로', hours: '17:00 ~ 02:00', price: '₩18,000~30,000',
    rating: 4.4, lat: 37.5543, lng: 126.9226, tip: '꼭 양념 소스에 찍어 드세요.',
  },
  {
    id: '3', name: '합정 일미락', category: '한식 / 국밥', emoji: '🍲',
    desc: '24시간 운영하는 뚝배기 국밥집. 진하고 구수한 국물이 해장으로도, 식사로도 최고.',
    address: '서울 마포구 합정동', hours: '24시간', price: '₩9,000~12,000',
    rating: 4.3, lat: 37.5502, lng: 126.9144, tip: '새벽에도 항상 붐벼요. 깍두기 국물 꼭 챙기세요!',
  },
  {
    id: '4', name: '상수 파스타 공방', category: '이탈리안 / 파스타', emoji: '🍝',
    desc: '매일 직접 뽑는 생면 파스타와 와인 페어링이 훌륭한 소규모 레스토랑.',
    address: '서울 마포구 상수동', hours: '12:00 ~ 22:00 (화 휴무)', price: '₩22,000~35,000',
    rating: 4.7, lat: 37.5480, lng: 126.9213, tip: '예약 필수! 2인 창가석 요청하면 분위기 최고예요 🕯️',
  },
  {
    id: '5', name: '연트럴파크 타코', category: '멕시칸 / 타코', emoji: '🌮',
    desc: '연남동 공원 앞 작은 타코 가게. 수제 살사와 아보카도가 듬뿍.',
    address: '서울 마포구 연남동 경의선 숲길 근처', hours: '11:00 ~ 21:00', price: '₩12,000~18,000',
    rating: 4.5, lat: 37.5618, lng: 126.9260, tip: '날씨 좋은 날 테이크아웃으로 숲길 산책하기 딱!',
  },
  {
    id: '6', name: '홍대 버거 팩토리', category: '버거 / 미국식', emoji: '🍔',
    desc: '수제 패티를 직화 그릴에 굽는 정통 아메리칸 버거.',
    address: '서울 마포구 홍익로', hours: '11:00 ~ 23:00', price: '₩14,000~20,000',
    rating: 4.2, lat: 37.5558, lng: 126.9256, tip: '더블 패티 강력 추천. 감자튀김은 트러플 소스 추가!',
  },
];

const EMOJIS = ['🍱','🔥','🍲','🍝','🌮','🍔','🍜','🍣','🍗','🥗','🍕','🫕','🍛','🥩','🍻','🍴'];

const EMPTY_FORM = (): Omit<Restaurant, 'id'> => ({
  name: '', category: '', emoji: '🍴', desc: '',
  address: '', hours: '', price: '', rating: 4.0,
  lat: 37.5563, lng: 126.9239, tip: '',
});

export default function HongdaePage() {
  const [restaurants, setRestaurants]     = useState<Restaurant[]>([]);
  const [selected, setSelected]           = useState<string | null>(null);
  const [modalMode, setModalMode]         = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget]       = useState<Restaurant | null>(null);
  const [form, setForm]                   = useState(EMPTY_FORM());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [mapReady, setMapReady]           = useState(false);

  // Location search state
  const [locQuery, setLocQuery]       = useState('');
  const [locResults, setLocResults]   = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [locSearching, setLocSearching] = useState(false);
  const [locError, setLocError]       = useState('');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setRestaurants(saved ? JSON.parse(saved) : DEFAULT_RESTAURANTS);
  }, []);

  const persist = (updated: Restaurant[]) => {
    setRestaurants(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM());
    setEditTarget(null);
    setLocQuery(''); setLocResults([]); setLocError('');
    setModalMode('add');
  };

  const openEdit = (r: Restaurant, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({ ...r });
    setEditTarget(r);
    setLocQuery(''); setLocResults([]); setLocError('');
    setModalMode('edit');
  };

  const closeModal = () => setModalMode(null);

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (modalMode === 'add') {
      persist([...restaurants, { ...form, id: Date.now().toString() }]);
    } else if (modalMode === 'edit' && editTarget) {
      persist(restaurants.map(r => r.id === editTarget.id ? { ...form, id: r.id } : r));
    }
    closeModal();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    persist(restaurants.filter(r => r.id !== deleteConfirm));
    if (selected === deleteConfirm) setSelected(null);
    setDeleteConfirm(null);
  };

  const f = (field: keyof typeof form, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Location search — Nominatim (OSM), API 키 불필요
  const searchLocation = async () => {
    if (!locQuery.trim()) return;
    setLocSearching(true);
    setLocResults([]);
    setLocError('');
    try {
      const params = new URLSearchParams({
        q: locQuery,
        format: 'json',
        countrycodes: 'kr',
        'accept-language': 'ko',
        limit: '6',
        addressdetails: '1',
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { 'User-Agent': 'mychang-hongdae/1.0' } }
      );
      if (!res.ok) throw new Error('network');
      const data = await res.json();
      if (data.length === 0) {
        setLocError('검색 결과가 없어요. 다른 검색어를 입력해보세요.');
      } else {
        setLocResults(data);
      }
    } catch {
      setLocError('검색에 실패했어요. 인터넷 연결을 확인해주세요.');
    } finally {
      setLocSearching(false);
    }
  };

  const pickLocation = (result: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const addr = result.address ?? {};
    const short = [
      addr.city || addr.county || addr.state,
      addr.suburb || addr.neighbourhood,
      addr.road,
      addr.house_number,
    ].filter(Boolean).join(' ') || result.display_name.split(',').slice(0, 3).join(', ');

    setForm(prev => ({
      ...prev,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: short,
    }));
    setLocResults([]);
    setLocQuery('');
    setLocError('');
  };

  return (
    <div className="hongdae-page">
      {/* Naver Maps SDK (geocoder submodule included) */}
      <Script
        src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=jmj922nbwr&submodules=geocoder"
        strategy="afterInteractive"
        onLoad={() => setMapReady(true)}
      />

      {/* Sticky header */}
      <header className="hongdae-header">
        <div className="hongdae-header-logo">
          <span>✦</span> mychang
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ fontSize: 20, marginBottom: 2 }}>🍜 홍대 맛집 지도</h1>
          <p className="page-subtitle">친구들과 홍대에서 모일 때를 위한 추천 맛집 · {restaurants.length}곳</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ 맛집 추가</button>
      </header>

      <div className="hongdae-content">
        <div className="hongdae-layout">
          {/* Map */}
          <div className="map-wrapper">
            {mapReady ? (
              <NaverMap
                restaurants={restaurants}
                selected={selected}
                onSelect={setSelected}
              />
            ) : (
              <div className="map-loading">
                <div className="map-loading-spinner" />
                <span>지도 불러오는 중...</span>
              </div>
            )}
          </div>

          {/* Restaurant Panel */}
          <div className="restaurant-panel">
            {restaurants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <div className="empty-state-title">맛집이 없어요</div>
                <div className="empty-state-desc">+ 맛집 추가로 첫 번째를 등록해봐요!</div>
              </div>
            ) : (
              restaurants.map((r) => (
                <div
                  key={r.id}
                  id={`rest-${r.id}`}
                  className={`rest-card ${selected === r.id ? 'selected' : ''}`}
                  onClick={() => setSelected(selected === r.id ? null : r.id)}
                >
                  {selected === r.id && <div className="selected-indicator" />}
                  <div className="rest-actions">
                    <button className="rest-action-btn edit" onClick={(e) => openEdit(r, e)} title="편집">✏️</button>
                    <button className="rest-action-btn delete" onClick={(e) => handleDelete(r.id, e)} title="삭제">🗑️</button>
                  </div>
                  <div className="rest-card-header">
                    <div className="rest-emoji">{r.emoji}</div>
                    <div className="rest-info">
                      <div className="rest-name">{r.name}</div>
                      <div className="rest-category">{r.category}</div>
                    </div>
                    <div className="rest-rating">★ {r.rating}</div>
                  </div>
                  <div className="rest-desc">{r.desc}</div>
                  <div className="rest-meta">
                    <span className="rest-badge">🕐 {r.hours}</span>
                    <span className="rest-badge">💰 {r.price}</span>
                  </div>
                  {selected === r.id && r.tip && (
                    <div className="rest-tip">💡 {r.tip}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <p className="hongdae-footer-note">
          지도 핀 또는 카드를 클릭하면 위치와 상세 정보를 볼 수 있어요 🗺️
        </p>
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {modalMode && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal rest-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === 'add' ? '🍴 새 맛집 추가' : '✏️ 맛집 편집'}
              </h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="rest-form">
              {/* emoji + name */}
              <div className="form-row" style={{ gridTemplateColumns: '72px 1fr' }}>
                <div className="form-group">
                  <label className="form-label">이모지</label>
                  <select className="select" value={form.emoji} onChange={e => f('emoji', e.target.value)}>
                    {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">이름 *</label>
                  <input className="input" placeholder="음식점 이름" value={form.name}
                    onChange={e => f('name', e.target.value)} />
                </div>
              </div>

              {/* category + rating */}
              <div className="form-row" style={{ gridTemplateColumns: '1fr 100px' }}>
                <div className="form-group">
                  <label className="form-label">카테고리</label>
                  <input className="input" placeholder="한식 / 국밥" value={form.category}
                    onChange={e => f('category', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">별점</label>
                  <input className="input" type="number" min="1" max="5" step="0.1" value={form.rating}
                    onChange={e => f('rating', parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              {/* desc */}
              <div className="form-group">
                <label className="form-label">설명</label>
                <textarea className="textarea" placeholder="음식점 설명을 써주세요" value={form.desc}
                  onChange={e => f('desc', e.target.value)} style={{ minHeight: 80 }} />
              </div>

              {/* hours + price */}
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label className="form-label">영업시간</label>
                  <input className="input" placeholder="11:00 ~ 22:00" value={form.hours}
                    onChange={e => f('hours', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">가격대</label>
                  <input className="input" placeholder="₩10,000~15,000" value={form.price}
                    onChange={e => f('price', e.target.value)} />
                </div>
              </div>

              {/* tip */}
              <div className="form-group">
                <label className="form-label">꿀팁 (선택)</label>
                <input className="input" placeholder="방문 전 알면 좋은 팁" value={form.tip ?? ''}
                  onChange={e => f('tip', e.target.value)} />
              </div>

              {/* Location search */}
              <div className="form-group">
                <label className="form-label">📍 위치 검색</label>
                <div className="loc-search-row">
                  <input
                    className="input"
                    placeholder="장소명 또는 주소 검색 (예: 홍대입구역)"
                    value={locQuery}
                    onChange={e => setLocQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchLocation()}
                  />
                  <button
                    className="btn btn-ghost"
                    onClick={searchLocation}
                    disabled={locSearching || !locQuery.trim()}
                  >
                    {locSearching ? '...' : '검색'}
                  </button>
                </div>

                {locError && <div className="loc-error">⚠️ {locError}</div>}

                {locResults.length > 0 && (
                  <div className="loc-results">
                    {locResults.map((r: any, i: number) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <button key={i} className="loc-result-item" onClick={() => pickLocation(r)}>
                        <span className="loc-result-road">
                          {r.display_name.split(',').slice(0, 3).join(', ')}
                        </span>
                        <span className="loc-result-jibun">
                          {r.type} · {r.display_name.split(',').pop()?.trim()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {form.address && form.lat !== 37.5563 && (
                  <div className="loc-confirmed">
                    ✅ {form.address}
                    <span style={{ color: 'var(--text-3)', fontSize: 11, marginLeft: 6 }}>
                      ({form.lat.toFixed(4)}, {form.lng.toFixed(4)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>취소</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>
                {modalMode === 'add' ? '추가하기' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🗑️ 삭제 확인</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>
              <strong style={{ color: 'var(--text-1)' }}>
                {restaurants.find(r => r.id === deleteConfirm)?.name}
              </strong>을(를) 삭제할까요?
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>이 작업은 되돌릴 수 없어요.</p>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>취소</button>
              <button className="btn btn-danger" onClick={confirmDelete}>삭제하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
