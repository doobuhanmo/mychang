"""R.LUX 공개 목록을 Playwright로 읽어 SQLite에 저장하고 할인율로 검색하는 로컬 도구.

설치:
    python3 -m pip install playwright
    python3 -m playwright install chromium

실행:
    python3 rlux_collector.py
"""

import asyncio
import argparse
import hashlib
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright


RLUX_URL = (
    "https://www.coupang.com/np/campaigns/18530?listSize=60&filterType=rocket_luxury"
    "&rating=0&isPriceRange=false&minPrice=&maxPrice=&component=&sorter=bestAsc"
    "&brand=&offerCondition=&filter=&fromComponent=N&channel=user&selectedPlpKeepFilter="
)
BASE_URL = "https://www.coupang.com"
DB_PATH = Path(__file__).with_name("rlux_products.db")


def init_db() -> None:
    """SQLite DB와 products 테이블을 생성한다."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                product_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                link TEXT NOT NULL,
                image_url TEXT NOT NULL DEFAULT '',
                price INTEGER NOT NULL,
                original_price INTEGER NOT NULL,
                discount_rate REAL NOT NULL,
                updated_at TIMESTAMP NOT NULL
            )
            """
        )
        columns = {row[1] for row in conn.execute("PRAGMA table_info(products)")}
        if "image_url" not in columns:
            conn.execute("ALTER TABLE products ADD COLUMN image_url TEXT NOT NULL DEFAULT ''")


def parse_price(value: Optional[str]) -> int:
    digits = re.sub(r"[^0-9]", "", value or "")
    return int(digits) if digits else 0


def product_id(link: str) -> str:
    return hashlib.sha256(link.encode("utf-8")).hexdigest()


def page_url(number: int) -> str:
    parsed = urlparse(RLUX_URL)
    query = parse_qs(parsed.query, keep_blank_values=True)
    query["page"] = [str(number)]
    return urlunparse(parsed._replace(query=urlencode(query, doseq=True)))


async def extract_page_products(page) -> list[dict]:
    """현재 목록 페이지의 보이는 상품 카드에서 필요한 값만 읽는다."""
    cards = page.locator('a[href*="/vp/products/"]')
    products: dict[str, dict] = {}

    for index in range(await cards.count()):
        try:
            card = cards.nth(index)
            href = await card.get_attribute("href")
            if not href:
                continue

            image = card.locator("img").first
            title = (await image.get_attribute("alt") or "").strip()
            image_url = (await image.get_attribute("src") or "").strip()
            original_price_node = card.locator("del")
            price_node = card.locator("strong")
            original_price_text = await original_price_node.first.text_content() if await original_price_node.count() else None
            price_text = await price_node.first.text_content() if await price_node.count() else None
            original_price = parse_price(original_price_text)
            price = parse_price(price_text)
            link = urljoin(BASE_URL, href)

            if not title or not original_price or not price or price >= original_price:
                continue

            products[link] = {
                "product_id": product_id(link),
                "title": title,
                "link": link,
                "image_url": image_url,
                "price": price,
                "original_price": original_price,
                "discount_rate": round((original_price - price) / original_price * 100, 2),
            }
        except Exception as error:  # 한 카드의 구조가 달라도 전체 수집을 멈추지 않는다.
            print(f"  카드 {index + 1}개째를 건너뜁니다: {error}")

    return list(products.values())


async def get_last_page_number(page) -> int:
    """페이지네이션 링크에서 현재 확인 가능한 가장 마지막 페이지를 찾는다."""
    hrefs = await page.locator('a[href*="page="]').evaluate_all(
        "links => links.map(link => link.href)"
    )
    numbers = []
    for href in hrefs:
        try:
            page_value = parse_qs(urlparse(href).query).get("page", ["0"])[0]
            numbers.append(int(page_value))
        except (TypeError, ValueError):
            continue
    return max(numbers, default=1)


def save_or_update_products(product_list: list[dict]) -> None:
    """수집한 상품을 링크 기준으로 UPSERT 처리한다."""
    if not product_list:
        return

    now = datetime.now(timezone.utc).isoformat()
    rows = [
        (
            product["product_id"], product["title"], product["link"], product.get("image_url", ""),
            product["price"], product["original_price"], product["discount_rate"], now,
        )
        for product in product_list
    ]
    with sqlite3.connect(DB_PATH) as conn:
        conn.executemany(
            """
            INSERT INTO products (product_id, title, link, image_url, price, original_price, discount_rate, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(product_id) DO UPDATE SET
                title = excluded.title,
                link = excluded.link,
                image_url = excluded.image_url,
                price = excluded.price,
                original_price = excluded.original_price,
                discount_rate = excluded.discount_rate,
                updated_at = excluded.updated_at
            """,
            rows,
        )


async def collect_data() -> int:
    """R.LUX 전용 필터 목록의 전체 페이지를 순회하여 DB에 저장한다."""
    init_db()
    seen_links: set[str] = set()
    saved_count = 0

    async with async_playwright() as playwright:
        # 일반 Chromium 창에서 공개 목록을 확인한다. 숨김/Stealth 모드는 사용하지 않는다.
        browser = await playwright.chromium.launch(headless=False)
        page = await browser.new_page(locale="ko-KR")

        try:
            current_page = 1
            last_page = 1
            while current_page <= last_page:
                print(f"R.LUX 목록 {current_page}페이지를 확인합니다…")
                await page.goto(page_url(current_page), wait_until="domcontentloaded", timeout=30000)
                await page.locator('a[href*="/vp/products/"]').first.wait_for(state="attached", timeout=15000)
                await page.wait_for_timeout(2000)  # 페이지 렌더링 완료를 위한 일반적인 대기

                products = await extract_page_products(page)
                if current_page == 1 and not products:
                    raise RuntimeError("R.LUX 전용 상품 카드를 찾지 못했습니다. 페이지 구조 또는 접근 상태를 확인하세요.")

                new_products = [product for product in products if product["link"] not in seen_links]
                seen_links.update(product["link"] for product in new_products)
                save_or_update_products(new_products)
                saved_count += len(new_products)

                # 페이지가 진행될수록 링크 범위가 바뀌는 경우까지 반영한다.
                last_page = max(last_page, await get_last_page_number(page))
                if not new_products and current_page > 1:
                    break
                current_page += 1
        finally:
            await browser.close()

    return saved_count


def search_by_discount(min_discount_rate: float) -> None:
    """기준 할인율 이상의 R.LUX 상품을 높은 할인율 순으로 출력한다."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            """
            SELECT title, original_price, price, discount_rate, link, updated_at
            FROM products
            WHERE discount_rate >= ?
            ORDER BY discount_rate DESC, price ASC
            """,
            (min_discount_rate,),
        ).fetchall()

    if not rows:
        print(f"{min_discount_rate:g}% 이상 할인 상품이 없습니다.")
        return

    print(f"\n{min_discount_rate:g}% 이상 할인 상품: {len(rows)}개\n")
    for number, (title, original_price, price, rate, link, updated_at) in enumerate(rows, start=1):
        print(f"[{number}] {rate:.0f}% 할인 | {title}")
        print(f"    정상가 {original_price:,}원 → 현재가 {price:,}원")
        print(f"    {link}")
        print(f"    갱신: {updated_at}\n")


def products_as_json(min_discount_rate: float = 0) -> list[dict]:
    """웹페이지 연동을 위해 DB 검색 결과를 JSON 호환 형태로 반환한다."""
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute(
            """
            SELECT product_id, title, link, image_url, price, original_price, discount_rate, updated_at
            FROM products WHERE discount_rate >= ?
            ORDER BY discount_rate DESC, price ASC
            """,
            (min_discount_rate,),
        ).fetchall()
    return [
        {
            "id": row[0], "name": row[1], "productUrl": row[2], "imageUrl": row[3], "price": row[4],
            "originalPrice": row[5], "discountRate": row[6], "updatedAt": row[7],
        }
        for row in rows
    ]


def import_json_payload(payload) -> int:
    """사용자가 직접 복사한 R.LUX 상품 JSON을 검증한 뒤 DB에 저장한다."""
    source = payload.get("products", []) if isinstance(payload, dict) else payload
    if not isinstance(source, list):
        raise ValueError("JSON은 상품 배열 또는 products 배열을 가진 객체여야 합니다.")

    normalized = []
    for raw in source:
        if not isinstance(raw, dict):
            continue
        title = str(raw.get("title") or raw.get("name") or "").strip()
        link = str(raw.get("link") or raw.get("productUrl") or raw.get("url") or "").strip()
        current_price = parse_price(str(raw.get("price") or raw.get("currentPrice") or ""))
        original_price = parse_price(str(raw.get("original_price") or raw.get("originalPrice") or ""))
        image_url = str(raw.get("image_url") or raw.get("imageUrl") or "").strip()

        if not title or not link or not current_price or not original_price or current_price >= original_price:
            continue
        normalized.append(
            {
                "product_id": str(raw.get("product_id") or raw.get("id") or product_id(link)),
                "title": title,
                "link": link,
                "image_url": image_url,
                "price": current_price,
                "original_price": original_price,
                "discount_rate": round((original_price - current_price) / original_price * 100, 2),
            }
        )

    save_or_update_products(normalized)
    return len(normalized)


async def main() -> None:
    init_db()
    while True:
        print("\nR.LUX 로컬 DB 도구")
        print("1. R.LUX 상품 수집 및 DB 저장")
        print("2. 할인율로 DB 검색")
        print("0. 종료")
        choice = input("선택: ").strip()

        if choice == "1":
            try:
                count = await collect_data()
                print(f"수집 완료: {count}개 상품을 저장/갱신했습니다.")
            except PlaywrightTimeoutError:
                print("페이지 로딩 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도하세요.")
            except Exception as error:
                print(f"수집하지 못했습니다: {error}")
        elif choice == "2":
            try:
                search_by_discount(float(input("최소 할인율(%): ").strip()))
            except ValueError:
                print("숫자로 입력하세요.")
        elif choice == "0":
            return
        else:
            print("1, 2, 0 중에서 선택하세요.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--collect-json", action="store_true")
    parser.add_argument("--export-json", action="store_true")
    parser.add_argument("--import-stdin-json", action="store_true")
    arguments, _ = parser.parse_known_args()

    if arguments.collect_json:
        try:
            print(json.dumps({"collected": asyncio.run(collect_data())}, ensure_ascii=False))
        except PlaywrightTimeoutError:
            print(json.dumps({"error": "R.LUX 목록에서 상품 카드를 기다리다 시간이 초과되었습니다."}, ensure_ascii=False))
        except Exception as error:
            print(json.dumps({"error": str(error)}, ensure_ascii=False))
    elif arguments.export_json:
        print(json.dumps({"products": products_as_json()}, ensure_ascii=False))
    elif arguments.import_stdin_json:
        try:
            print(json.dumps({"saved": import_json_payload(json.load(sys.stdin))}, ensure_ascii=False))
        except (ValueError, json.JSONDecodeError) as error:
            print(json.dumps({"error": str(error)}, ensure_ascii=False))
    else:
        asyncio.run(main())
