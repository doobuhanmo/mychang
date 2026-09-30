import { spawn } from 'node:child_process';
import path from 'node:path';

const collectorPath = path.join(process.cwd(), 'app/(main)/projects/temp/rlux-price-finder/rlux_collector.py');
type StoredProducts = { products: Array<{ id: string; name: string; productUrl: string; imageUrl: string; price: number; originalPrice: number }> };

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function runPython(args: string[], input?: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const process = spawn('python3', [collectorPath, ...args]);
    let stdout = '';
    let stderr = '';
    process.stdout.on('data', (chunk) => { stdout += chunk; });
    process.stderr.on('data', (chunk) => { stderr += chunk; });
    process.on('error', reject);
    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || '로컬 Python 도구를 실행하지 못했습니다.'));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error('로컬 Python 도구의 응답을 읽지 못했습니다.'));
      }
    });
    process.stdin.end(input);
  });
}

function responseProducts(data: { products: Array<{ id: string; name: string; productUrl: string; imageUrl: string; price: number; originalPrice: number }> }) {
  return data.products.map((product) => ({
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
    regularPrice: product.originalPrice,
    currentPrice: product.price,
  }));
}

export async function GET() {
  try {
    const data = await runPython(['--export-json']) as StoredProducts;
    return Response.json({ products: responseProducts(data) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '로컬 DB를 읽지 못했습니다.' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const imported = await runPython(['--import-stdin-json'], JSON.stringify(payload)) as { saved?: number; error?: string };
    if (imported.error) return Response.json(imported, { status: 400 });
    const data = await runPython(['--export-json']) as StoredProducts;
    return Response.json({ saved: imported.saved || 0, products: responseProducts(data) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '상품 데이터를 저장하지 못했습니다.' }, { status: 502 });
  }
}
