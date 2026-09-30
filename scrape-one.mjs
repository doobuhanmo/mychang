#!/usr/bin/env node
import { chromium } from '/Users/mim/Desktop/dev/trdp/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import https from 'https';

const SESSION_ID = 'ltfpi2WGRewr1HgS7A-Q_T9Cgl11nxv4fOa_8K5ltDs';
const POST_URL = 'https://www.patreon.com/VeyricThekerr/posts/262-thekerr-note-170672285';
const POST_ID = '170672285';
const POST_NUM = 262;
const OUT_DIR = `/Users/mim/Desktop/dev/mychang/public/theoker/${POST_ID}`;

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
});

await context.addCookies([{
  name: 'session_id',
  value: SESSION_ID,
  domain: '.patreon.com',
  path: '/',
  httpOnly: true,
  secure: true,
}]);

const page = await context.newPage();
console.log('Loading page...');
await page.goto(POST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

try {
  await page.waitForSelector('main h1', { timeout: 15000 });
} catch {
  console.log('h1 not found, trying anyway...');
}

// 스크롤해서 lazy 이미지 강제 로드
await page.evaluate(async () => {
  await new Promise(resolve => {
    let totalHeight = 0;
    const distance = 400;
    const timer = setInterval(() => {
      window.scrollBy(0, distance);
      totalHeight += distance;
      if (totalHeight >= document.body.scrollHeight) {
        clearInterval(timer);
        window.scrollTo(0, 0);
        resolve();
      }
    }, 100);
  });
});
await page.waitForTimeout(3000);

const result = await page.evaluate(() => {
  const main = document.querySelector('main');
  if (!main) return null;

  const h1 = main.querySelector('h1');
  const title = h1?.textContent?.trim() ?? '';

  let container = h1?.parentElement;
  while (container && container.querySelectorAll('p').length < 2) {
    container = container?.parentElement;
  }
  if (!container) container = main;

  const contentDiv = Array.from(container.children).find(el =>
    el.querySelectorAll('p').length >= 1 && !el.querySelector('h1')
  ) || container;

  const getImgSrc = (img) => {
    // data-src, srcset, src 순으로 진짜 URL 추출
    const src = img.dataset.src || img.src || '';
    const srcset = img.srcset || img.dataset.srcset || '';
    // srcset에서 가장 큰 이미지 URL 추출
    if (srcset) {
      const parts = srcset.split(',').map(s => s.trim().split(' '));
      const largest = parts.reduce((a, b) => {
        const aw = parseFloat(a[1]) || 0;
        const bw = parseFloat(b[1]) || 0;
        return bw > aw ? b : a;
      });
      if (largest[0]) return largest[0];
    }
    return src;
  };
  const isValidImg = (img) => {
    const src = getImgSrc(img);
    return src && !src.includes('avatar') && !src.includes('profile') && !src.startsWith('data:') && src.startsWith('http');
  };

  const blocks = [];
  const walk = (el) => {
    for (const child of el.children) {
      if (child.tagName === 'P') {
        const text = child.textContent.trim();
        if (text.length > 3) blocks.push({ type: 'text', html: child.innerHTML, text });
        const imgs = child.querySelectorAll('img');
        imgs.forEach(img => {
          if (isValidImg(img)) blocks.push({ type: 'image', src: getImgSrc(img) });
        });
      } else if (['H2','H3','H4'].includes(child.tagName)) {
        const text = child.textContent.trim();
        if (text) blocks.push({ type: 'heading', tag: child.tagName.toLowerCase(), text });
      } else if (child.tagName === 'IMG') {
        if (isValidImg(child)) blocks.push({ type: 'image', src: getImgSrc(child) });
      } else if (['DIV','FIGURE','SPAN','SECTION'].includes(child.tagName)) {
        const img = child.querySelector('img');
        if (img && isValidImg(img)) blocks.push({ type: 'image', src: getImgSrc(img) });
        const ps = child.querySelectorAll('p');
        if (ps.length > 0) walk(child);
        else {
          const text = child.textContent.trim();
          if (text.length > 10 && !img) blocks.push({ type: 'text', html: child.innerHTML, text });
        }
      }
    }
  };

  walk(contentDiv);

  // fallback
  if (blocks.length === 0) {
    container.querySelectorAll('p').forEach(p => {
      const t = p.textContent.trim();
      if (t.length > 5) blocks.push({ type: 'text', html: p.innerHTML, text: t });
    });
  }

  return { title, blocks };
});

await browser.close();

if (!result) {
  console.error('Failed to extract content');
  process.exit(1);
}

console.log(`Title: ${result.title}`);
console.log(`Blocks: ${result.blocks.length}`);

// Download images
const imageNames = [];
let imgIdx = 1;
for (const block of result.blocks) {
  if (block.type === 'image') {
    const ext = block.src.match(/\.(png|jpg|jpeg|webp|gif)/i)?.[1] ?? 'jpg';
    const fname = `image_${imgIdx}.${ext}`;
    const fpath = path.join(OUT_DIR, fname);
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(fpath);
      https.get(block.src, res => {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', reject);
    }).catch(e => console.warn(`Image download failed: ${e.message}`));
    block.localName = fname;
    imageNames.push(fname);
    imgIdx++;
    console.log(`  Downloaded ${fname}`);
  }
}

// Build content.html
let html = '';
for (const block of result.blocks) {
  if (block.type === 'text') {
    html += `<p>${block.html || block.text}</p>`;
  } else if (block.type === 'heading') {
    html += `<${block.tag}>${block.text}</${block.tag}>`;
  } else if (block.type === 'image' && block.localName) {
    html += `<img src="/theoker/${POST_ID}/${block.localName}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0;">`;
  }
}

fs.writeFileSync(path.join(OUT_DIR, 'content.html'), html, 'utf-8');
console.log(`Saved content.html (${html.length} bytes)`);

// Update index.json
const indexPath = '/Users/mim/Desktop/dev/mychang/public/theoker/index.json';
const posts = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

const existing = posts.find(p => p.id === POST_ID);
const excerpt = result.blocks.filter(b => b.type === 'text').map(b => b.text).join(' ').slice(0, 300);

if (!existing) {
  // Get date from page title/meta or use today
  const today = new Date().toISOString().slice(0, 10);
  posts.push({
    id: POST_ID,
    num: POST_NUM,
    title: `${POST_NUM}. THEKERR NOTE 2`,
    date: today,
    images: imageNames,
    excerpt,
  });
  console.log('Added to index.json');
} else {
  existing.images = imageNames;
  existing.excerpt = excerpt;
  console.log('Updated existing entry in index.json');
}

fs.writeFileSync(indexPath, JSON.stringify(posts, null, 2), 'utf-8');
console.log('Done!');
