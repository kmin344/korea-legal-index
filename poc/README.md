# Korea Law Index — PoC

A first, usable proof of concept: an agent-native search index of Korean
primary law (법령), built on the official law.go.kr DRF Open API.

It mirrors Firecrawl gov-index's thin client: a search surface over a
normalized record. The CLI, REST, and MCP surfaces need no client key. The
server itself needs one key for law.go.kr (see below). It covers 법령 (statutes, 시행령, 시행규칙). The citation
graph and 자치법규/해석례/판례 come in later phases (see `../03-build-plan.md`).

## Requirements

- Node.js 18 or later (built-in `fetch`). Tested on Node 24.

## Install

```bash
cd poc
npm install
```

## The key (OC 인증키) — required

You need your own key. The old shared sample key `test` no longer works:
law.go.kr now rejects it with "사용자 정보 검증에 실패하였습니다" (verified
2026-11-04).

1. Sign up for a free key at <https://open.law.go.kr>.
2. Register the IP address or domain of the machine that calls the API. The API
   checks the caller against this registration.
3. Set the key before you run any command:

```bash
export OPEN_LAW_OC=<your-oc-id>
```

If `OPEN_LAW_OC` is not set, the code prints a warning to stderr and falls back
to `test`. Any API call then fails with a clear error instead of 0 results.

## 1. CLI

```bash
node src/cli.mjs search "민법" --limit 5
node src/cli.mjs get 284415 --articles --limit 3
node src/cli.mjs get 284415 --json
```

- `search` ranks exact and prefix title matches first (a name search for
  "민법" returns 민법 before 난민법).
- `get <MST>` takes the MST (법령일련번호) from a search result.

## 2. REST

```bash
npm run serve           # http://localhost:8787
curl "http://localhost:8787/health"
curl "http://localhost:8787/v1/search/law?query=개인정보%20보호법&k=3"
curl "http://localhost:8787/v1/law/284415"
```

## 3. MCP (agent-native)

Register the MCP server with Claude Code (run this from the `poc/` directory):

```bash
claude mcp add korea-law -e OPEN_LAW_OC=<your-oc-id> -- node "$(pwd)/src/mcp.mjs"
```

Tools:
- `search_korean_law(query, k?)` — search 법령 by name.
- `get_law_resource(mst)` — fetch a law and its 조문 as full text.

Each 조문 carries a canonical id like `law:011357:조:15`, which the future
citation graph will link.

## Record shape (`LawRecord`)

Search result and `get` detail share these fields: `id` (canonical),
`mst`, `lawId`, `title`, `type`, `issuer` (소관부처), `status` (현행/연혁/폐지),
`effectiveDate` (시행일자), `promulgationDate`, `promulgationNo`, `sourceUrl`.
`get` adds `articleCount` and `articles[]` (`canonicalId`, `no`, `title`,
`effectiveDate`, `text`).

## Not in the PoC (next phases)

- Citation graph (조문 references, 위임 relations).
- A stored index (the PoC calls the API live; add Postgres + search next).
- `asOf` date versioning, 자치법규, 법령해석례, and the free 판례 subset.

## License and data

The code is under the MIT License (see [../LICENSE](../LICENSE)). The legal data
from law.go.kr is not covered by that license and has its own reuse terms (see
[../NOTICE](../NOTICE)). This project provides sources, not legal advice.
