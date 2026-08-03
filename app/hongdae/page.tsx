'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import './hongdae.css';
import 'leaflet/dist/leaflet.css';

// Client-only map (no SSR)
const HongdaeMap = dynamic(() => import('./HongdaeMap'), { ssr: false });

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

const RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: '연남동 경양식1920',
    category: '경양식 / 돈까스',
    emoji: '🍱',
    desc: '1920년대 감성으로 꾸며진 레트로 분위기의 경양식집. 두툼한 수제 돈까스와 진한 소스가 일품. 줄 서서 먹을 가치 있음.',
    address: '서울 마포구 연남동',
    hours: '11:30 ~ 21:00 (월 휴무)',
    price: '₩15,000~20,000',
    rating: 4.6,
    lat: 37.5606,
    lng: 126.9244,
    tip: '점심엔 줄이 길어요. 2시~4시 사이가 조금 덜 붐벼요 👍',
  },
  {
    id: '2',
    name: '홍대 양꼬치 거리',
    category: '중식 / 양꼬치',
    emoji: '🔥',
    desc: '홍대 양꼬치 골목의 대표 맛집. 연기 폴폴 피어오르는 숯불 양꼬치에 칭따오 맥주 한 잔이면 완벽한 밤!',
    address: '서울 마포구 와우산로',
    hours: '17:00 ~ 02:00',
    price: '₩18,000~30,000',
    rating: 4.4,
    lat: 37.5543,
    lng: 126.9226,
    tip: '꼭 양념 소스에 찍어 드세요. 인원이 4명 이상이면 더 재밌어요!',
  },
  {
    id: '3',
    name: '합정 일미락',
    category: '한식 / 국밥',
    emoji: '🍲',
    desc: '24시간 운영하는 뚝배기 국밥집. 진하고 구수한 국물이 해장으로도, 식사로도 최고. 홍대 놀고 나서 마무리로 딱!',
    address: '서울 마포구 합정동',
    hours: '24시간',
    price: '₩9,000~12,000',
    rating: 4.3,
    lat: 37.5502,
    lng: 126.9144,
    tip: '새벽에도 항상 붐벼요. 깍두기 국물 꼭 챙기세요!',
  },
  {
    id: '4',
    name: '상수 파스타 공방',
    category: '이탈리안 / 파스타',
    emoji: '🍝',
    desc: '소규모 공방 스타일의 아담한 파스타 레스토랑. 매일 직접 뽑는 생면 파스타와 와인 페어링이 훌륭함. 분위기 있는 저녁 식사로 추천.',
    address: '서울 마포구 상수동',
    hours: '12:00 ~ 22:00 (화 휴무)',
    price: '₩22,000~35,000',
    rating: 4.7,
    lat: 37.5480,
    lng: 126.9213,
    tip: '예약 필수! 2인 창가석 요청하면 분위기 최고예요 🕯️',
  },
  {
    id: '5',
    name: '연트럴파크 카페거리 타코',
    category: '멕시칸 / 타코',
    emoji: '🌮',
    desc: '연남동 공원 앞 작은 타코 가게. 수제 살사와 아보카도가 듬뿍 들어간 타코가 맛있고, 야외 테이블에서 공원 뷰를 즐기며 먹기 좋음.',
    address: '서울 마포구 연남동 경의선 숲길 근처',
    hours: '11:00 ~ 21:00',
    price: '₩12,000~18,000',
    rating: 4.5,
    lat: 37.5618,
    lng: 126.9260,
    tip: '날씨 좋은 날 경의선 숲길 산책하며 테이크아웃으로도 딱!',
  },
  {
    id: '6',
    name: '홍대 버거 팩토리',
    category: '버거 / 미국식',
    emoji: '🍔',
    desc: '수제 패티를 직화 그릴에 굽는 정통 아메리칸 버거. 두툼한 패티, 신선한 재료. 홍대 클럽 전 든든하게 먹기 좋음.',
    address: '서울 마포구 홍익로',
    hours: '11:00 ~ 23:00',
    price: '₩14,000~20,000',
    rating: 4.2,
    lat: 37.5558,
    lng: 126.9256,
    tip: '더블 패티 강력 추천. 감자튀김은 트러플 소스 추가!',
  },
];

export default function HongdaePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRest = RESTAURANTS.find((r) => r.id === selected);

  return (
    <>
      {/* Back */}
      <Link href="/projects" className="back-link">
        ← 프로젝트로 돌아가기
      </Link>

      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 className="page-title">🍜 홍대 맛집 지도</h1>
        <p className="page-subtitle">
          친구들과 홍대에서 모일 때를 위한 추천 맛집 모음 · {RESTAURANTS.length}곳
        </p>
      </div>

      <div className="hongdae-layout">
        {/* Map */}
        <div className="map-wrapper">
          <HongdaeMap
            restaurants={RESTAURANTS}
            selected={selected}
            onSelect={setSelected}
          />
        </div>

        {/* Restaurant List */}
        <div className="restaurant-panel">
          {RESTAURANTS.map((r) => (
            <div
              key={r.id}
              id={`rest-${r.id}`}
              className={`rest-card ${selected === r.id ? 'selected' : ''}`}
              onClick={() => setSelected(selected === r.id ? null : r.id)}
            >
              {selected === r.id && <div className="selected-indicator" />}
              <div className="rest-card-header">
                <div className="rest-emoji">{r.emoji}</div>
                <div className="rest-info">
                  <div className="rest-name">{r.name}</div>
                  <div className="rest-category">{r.category}</div>
                </div>
                <div className="rest-rating">
                  ★ {r.rating}
                </div>
              </div>
              <div className="rest-desc">{r.desc}</div>
              <div className="rest-meta">
                <span className="rest-badge">🕐 {r.hours}</span>
                <span className="rest-badge">💰 {r.price}</span>
              </div>
              {selected === r.id && r.tip && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'var(--accent-3)',
                    lineHeight: 1.6,
                  }}
                >
                  💡 {r.tip}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p
        style={{
          marginTop: 16,
          fontSize: 12,
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}
      >
        지도 핀 또는 카드를 클릭하면 상세 정보를 볼 수 있어요 🗺️
      </p>
    </>
  );
}
