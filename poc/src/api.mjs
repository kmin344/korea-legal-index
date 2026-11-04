// DRF (law.go.kr Open API) client + normalization to the LawRecord shape.
// You need your own OC 인증키 (free signup at open.law.go.kr). Register the IP
// address or domain of the machine that calls the API with that key, then set
// OPEN_LAW_OC. The old shared sample key "test" is the fallback, but law.go.kr
// now rejects it with "사용자 정보 검증에 실패하였습니다" (verified 2026-11-04).

const BASE = 'https://www.law.go.kr/DRF';
export const OC = process.env.OPEN_LAW_OC || 'test';
export const usingSampleKey = OC === 'test';

// A safe label for logs and the /health endpoint. It never prints a real OC
// key. The sample key "test" is public, so it is safe to name.
export const ocLabel = usingSampleKey ? 'test (sample)' : 'set (hidden)';

if (usingSampleKey && !process.env.OPEN_LAW_SILENCE_SAMPLE_WARNING) {
  // Warn on stderr so it never corrupts CLI stdout or MCP stdio messages.
  process.stderr.write(
    'korea-law-index: OPEN_LAW_OC is not set, so the shared sample key OC=test is used. ' +
      'law.go.kr now rejects this key. Get a free key at open.law.go.kr, register your ' +
      'IP address or domain, and set OPEN_LAW_OC.\n',
  );
}

async function drf(path, params) {
  const url = new URL(`${BASE}/${path}`);
  url.searchParams.set('OC', OC);
  url.searchParams.set('type', 'JSON');
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': 'korea-law-index-poc/0.1' },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`DRF ${path} HTTP ${res.status}`);
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(
      `DRF ${path} returned non-JSON. Check the OC key and params. First 200 chars:\n${body.slice(0, 200)}`,
    );
  }
  // On an auth failure DRF answers HTTP 200 with { result, msg } and no data
  // (for example, an unregistered OC key or an unregistered caller IP/domain).
  // Surface it instead of returning an empty result set.
  if (json && typeof json === 'object' && 'result' in json && 'msg' in json) {
    throw new Error(
      `DRF ${path} rejected the request: ${json.result} ${json.msg} ` +
        `(OC=${ocLabel}; get a key at open.law.go.kr, register your IP/domain, set OPEN_LAW_OC)`,
    );
  }
  return json;
}

function pick(obj, key) {
  // DRF returns some fields as a plain string and some as { content: "..." }.
  const v = obj?.[key];
  if (v && typeof v === 'object' && 'content' in v) return v.content;
  return v ?? null;
}

export function lawSourceUrl(title) {
  return `https://www.law.go.kr/법령/${encodeURIComponent(title)}`;
}

export function normalizeSearchItem(raw) {
  const title = raw['법령명한글'];
  return {
    id: `law:${raw['법령ID']}`,
    mst: raw['법령일련번호'],
    lawId: raw['법령ID'],
    title,
    type: raw['법령구분명'] ?? null,
    issuer: raw['소관부처명'] ?? null,
    status: raw['현행연혁코드'] ?? null,
    effectiveDate: raw['시행일자'] ?? null,
    promulgationDate: raw['공포일자'] ?? null,
    promulgationNo: raw['공포번호'] ?? null,
    sourceUrl: lawSourceUrl(title),
  };
}

export async function searchLaws({ query, limit = 10 }) {
  // Over-fetch, then rank client-side, because the DRF name search matches
  // substrings (a search for "민법" also returns "난민법"). We surface exact
  // and prefix title matches first.
  const fetchCount = Math.min(Math.max(limit, 50), 100);
  const j = await drf('lawSearch.do', {
    target: 'law',
    query,
    display: fetchCount,
    search: 1, // 1 = by law name
  });
  const ls = j['LawSearch'] || {};
  let list = ls['law'] || [];
  if (!Array.isArray(list)) list = list ? [list] : [];
  const q = query.trim();
  const rank = (t) => (t === q ? 0 : t && t.startsWith(q) ? 1 : 2);
  const results = list
    .map(normalizeSearchItem)
    .sort((a, b) => rank(a.title) - rank(b.title))
    .slice(0, limit);
  return {
    query,
    total: Number(ls['totalCnt'] ?? list.length),
    count: results.length,
    results,
  };
}

function articlesFromDetail(law, lawId) {
  const unit = law?.['조문']?.['조문단위'];
  const arr = Array.isArray(unit) ? unit : unit ? [unit] : [];
  const out = [];
  for (const u of arr) {
    if (u['조문여부'] !== '조문') continue; // skip 장/절 headers (조문여부 = "전문")
    const parts = [];
    const content = (u['조문내용'] || '').trim();
    if (content) parts.push(content);
    const hang = u['항'];
    const hangArr = Array.isArray(hang) ? hang : hang ? [hang] : [];
    for (const h of hangArr) {
      const hc = (h['항내용'] || '').trim();
      if (hc) parts.push(hc);
      const ho = h['호'];
      const hoArr = Array.isArray(ho) ? ho : ho ? [ho] : [];
      for (const o of hoArr) {
        const oc = (o['호내용'] || '').trim();
        if (oc) parts.push(oc);
      }
    }
    const no = u['조문번호'];
    out.push({
      canonicalId: `law:${lawId}:조:${no}`,
      no,
      title: u['조문제목'] || null,
      effectiveDate: u['조문시행일자'] || null,
      text: parts.join('\n'),
    });
  }
  return out;
}

export async function getLaw({ mst }) {
  const j = await drf('lawService.do', { target: 'law', MST: mst });
  const law = j['법령'];
  if (!law) throw new Error(`No 법령 found for MST=${mst}`);
  const basic = law['기본정보'] || {};
  const lawId = pick(basic, '법령ID');
  const title = pick(basic, '법령명_한글');
  const articles = articlesFromDetail(law, lawId);
  return {
    id: `law:${lawId}`,
    mst,
    lawId,
    title,
    type: pick(basic, '법종구분'),
    issuer: pick(basic, '소관부처'),
    effectiveDate: pick(basic, '시행일자'),
    promulgationDate: pick(basic, '공포일자'),
    promulgationNo: pick(basic, '공포번호'),
    sourceUrl: lawSourceUrl(title),
    articleCount: articles.length,
    articles,
  };
}
