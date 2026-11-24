// Offline tests. They replace global fetch, so no network and no OC key.
// Run: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.OPEN_LAW_OC = 'unit-test-key';
const { searchLaws, getLaw, lawSourceUrl } = await import('../src/api.mjs');
const { searchFixture, lawFixture, authErrorFixture } = await import('./fixtures.mjs');

let calls;
function mockFetch(json) {
  calls = [];
  globalThis.fetch = async (url) => {
    calls.push(new URL(url));
    return { ok: true, status: 200, text: async () => JSON.stringify(json) };
  };
}

beforeEach(() => {
  calls = [];
});

test('lawSourceUrl encodes the law title', () => {
  assert.equal(
    lawSourceUrl('민법'),
    `https://www.law.go.kr/법령/${encodeURIComponent('민법')}`,
  );
});

test('searchLaws ranks the exact title first and the prefix match second', async () => {
  mockFetch(searchFixture);
  const out = await searchLaws({ query: '민법', limit: 10 });
  assert.deepEqual(
    out.results.map((r) => r.title),
    ['민법', '민법 시행규칙', '난민법'],
  );
  assert.equal(out.total, 3);
});

test('searchLaws returns a source link and a canonical id for each result', async () => {
  mockFetch(searchFixture);
  const [first] = (await searchLaws({ query: '민법', limit: 1 })).results;
  assert.equal(first.id, 'law:000001');
  assert.equal(first.mst, '900001');
  assert.equal(first.sourceUrl, lawSourceUrl('민법'));
});

test('searchLaws sends the key, the JSON type, and the name-search mode', async () => {
  mockFetch(searchFixture);
  await searchLaws({ query: '민법' });
  const p = calls[0].searchParams;
  assert.equal(p.get('OC'), 'unit-test-key');
  assert.equal(p.get('type'), 'JSON');
  assert.equal(p.get('target'), 'law');
  assert.equal(p.get('search'), '1');
  assert.equal(p.get('query'), '민법');
});

test('getLaw skips 장 headers and joins 조, 항, and 호 text', async () => {
  mockFetch(lawFixture);
  const law = await getLaw({ mst: '900001' });
  assert.equal(law.title, '민법');
  assert.equal(law.articleCount, 1);
  const [a] = law.articles;
  assert.equal(a.canonicalId, 'law:000001:조:2');
  assert.equal(a.title, '신의성실');
  assert.equal(
    a.text,
    '제2조(신의성실)\n① 권리의 행사와 의무의 이행은 신의에 좇아 성실히 하여야 한다.\n1. 예시 호',
  );
  assert.equal(law.sourceUrl, lawSourceUrl('민법'));
});

test('getLaw throws when the response has no 법령', async () => {
  mockFetch({});
  await assert.rejects(getLaw({ mst: '1' }), /No 법령 found for MST=1/);
});

test('an auth failure throws an error and does not return an empty result', async () => {
  mockFetch(authErrorFixture);
  await assert.rejects(searchLaws({ query: '민법' }), /rejected the request/);
});
