#!/usr/bin/env node
// Minimal REST surface for the PoC. Zero dependencies. The REST API itself
// needs no client key; the server uses OPEN_LAW_OC to call law.go.kr.
//   GET /health
//   GET /v1/search/law?query=<q>&k=<n>
//   GET /v1/law/<MST>
import { createServer } from 'node:http';
import { searchLaws, getLaw, ocLabel } from './api.mjs';

const PORT = Number(process.env.PORT || 8787);

function send(res, code, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/health') {
      return send(res, 200, { ok: true, oc: ocLabel });
    }
    if (url.pathname === '/v1/search/law') {
      const query = url.searchParams.get('query');
      const k = Number(url.searchParams.get('k') || 10);
      if (!query) return send(res, 400, { success: false, error: 'query is required' });
      const out = await searchLaws({ query, limit: k });
      return send(res, 200, { success: true, ...out });
    }
    const m = url.pathname.match(/^\/v1\/law\/([^/]+)$/);
    if (m) {
      const law = await getLaw({ mst: decodeURIComponent(m[1]) });
      return send(res, 200, { success: true, law });
    }
    return send(res, 404, { success: false, error: 'not found' });
  } catch (e) {
    return send(res, 500, { success: false, error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`korea-law PoC REST on http://localhost:${PORT} (OC=${ocLabel})`);
});
