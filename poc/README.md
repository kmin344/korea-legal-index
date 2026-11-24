# Korea Law Index — PoC

A first, usable proof of concept: an agent-native search index of Korean
primary law (법령), built on the official law.go.kr DRF Open API.

It mirrors Firecrawl gov-index's thin client: a search surface over a
normalized record. The CLI, REST, and MCP surfaces need no client key. The
server itself needs one key for law.go.kr (see below). It covers 법령 (statutes, 시행령, 시행규칙). The citation
graph and 자치법규/해석례/판례 come in later phases (see `../02-build-plan.md`).

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

## Example: query to result and source link

Step 1: search for a law by name.

```bash
node src/cli.mjs search "민법" --limit 2
```

Step 2: read the result. Each result has a canonical id, an MST, and a source
link to law.go.kr.

```text
"민법" — 3 건 (상위 2건 표시)

민법  [법률, 현행]
  MST 900001 · law:000001 · 소관 법무부 · 시행 20240101
  https://www.law.go.kr/법령/%EB%AF%BC%EB%B2%95
민법 시행규칙  [대통령령, 현행]
  MST 900003 · law:000003 · 소관 법무부 · 시행 20240101
  https://www.law.go.kr/법령/%EB%AF%BC%EB%B2%95%20%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99
```

Step 3: fetch the 조문 text with the MST from the result.

```bash
node src/cli.mjs get 900001 --articles --limit 1
```

```text
민법  [법률]
law:000001 · MST 900001 · 소관 법무부 · 시행 20240101
https://www.law.go.kr/법령/%EB%AF%BC%EB%B2%95
조문 1개

[law:000001:조:2] 신의성실
  제2조(신의성실)
  ① 권리의 행사와 의무의 이행은 신의에 좇아 성실히 하여야 한다.
  1. 예시 호
```

**Note:** This output comes from the test fixture in `tests/fixtures.mjs`.
The values (MST, dates, and 조문 text) are made up. The output format is
real. The format comes from the CLI code. A live query with your OC key returns
real law data in the same format.

## Tests

The tests run offline. They replace `fetch`, so they need no OC key and no
network.

```bash
npm test
```

They check:
- Search ranks an exact title match first (민법 before 난민법).
- Each result has a canonical id and a source link.
- The request carries the key, the JSON type, and the name-search mode.
- `get` skips 장 headers and joins 조, 항, and 호 text.
- An auth failure throws an error and does not return an empty result.

## Not in the PoC (next phases)

- Citation graph (조문 references, 위임 relations).
- A stored index (the PoC calls the API live; add Postgres + search next).
- `asOf` date versioning, 자치법규, 법령해석례, and the free 판례 subset.

## License and data

The code is under the MIT License (see [../LICENSE](../LICENSE)). The legal data
from law.go.kr is not covered by that license and has its own reuse terms (see
[../NOTICE](../NOTICE)). This project provides sources, not legal advice.
