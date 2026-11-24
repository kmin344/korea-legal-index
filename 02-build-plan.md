# Build plan — Korean primary-law index

An agent-native, free, citation-linked index of Korean primary law. Grounded
in the Korea supply map.

## 1. Scope (MVP)

- **In:** 법령 + 시행령 + 시행규칙 + 행정규칙 + 자치법규 + 법령해석례.
- **Out:** the full 판례 corpus (use the free subset plus deep links only), a
  consumer UI, and user accounts.
- **Deliverable:** one keyless REST search endpoint and one MCP tool.

## 2. Architecture (layers, dependencies flow inward)

1. Ingestion adapter — a client for the `open.law.go.kr` Open API.
2. Normalization (domain) — raw responses become one `LawRecord` type.
3. Citation graph builder — parses references and stores edges.
4. Store and search index — records, versions, and edges.
5. Serving adapters — a REST API and an MCP server.

Keep the API client and store details out of the domain layer. Normalize once,
at the ingestion boundary, with a format-aware parser.

## 3. Data model (`LawRecord`)

Each record has the fields of a normalized legal text. It also has the two fields Korea needs: effective date and
status.

- `id` — canonical ID, for example `law:<법령ID>:조:<조번호>`.
- `type` — 법령 | 시행령 | 시행규칙 | 행정규칙 | 자치법규 | 법령해석례.
- `title`, `articleTitle` (조문제목).
- `text` — the verbatim 조문 본문 (quoted, not summarized).
- `jurisdiction` — 소관부처, or a region code for 자치법규.
- `effectiveDate` (시행일자), `promulgationDate` (공포일자),
  `promulgationNo` (공포번호).
- `status` — 현행 | 연혁 | 폐지.
- `sourceUrl` — the canonical law.go.kr link.
- `cites` — outbound canonical IDs.
- `citedBy` — inbound canonical IDs (derived).
- `versionOf` — the lineage link for 연혁.

## 4. Citation graph

This is the real work. The graph lives on the server, not in the client.

- Parse 조문 본문 for references: `제750조`, `「민법」 제750조`,
  `같은 법 제○조`, and 위임 relations (법령 ↔ 시행령 ↔ 시행규칙).
- Resolve each reference to a canonical ID.
- Store edges in both directions (`cites` and `citedBy`).
- Start with intra-법령 and 위임 edges (high precision). Add 판례 → 법령 edges
  later from the free 판례 subset.

## 5. Serving

- REST (keyless, free):
  `GET /v1/search/law?query=&type=&jurisdiction=&asOf=&cites=&k=`.
  - `asOf` (a date) returns the version in force on that date. A Korea-specific
    need and a differentiator.
- Detail: `GET /v1/law/{id}` returns the full 조문 plus `cites` and `citedBy`.
- MCP: two tools — `search_korean_law` and `get_law_resource` (by canonical
  ID). Package it as a Claude/ChatGPT connector.

## 6. Ingestion pipeline

- Enumerate records with each type's 목록 API. Fetch each with the 본문 API. Use
  the OC 인증키 and respect rate limits.
- Sync incrementally by 시행일자 and 개정. Keep the 연혁 (history).
- Store the raw response (for provenance) next to the normalized record.

## 7. Tech stack (pragmatic)

- Language: TypeScript/Node. It matches the MCP SDK and the Firecrawl-style CLI
  pattern.
- Store/search: PostgreSQL with full-text search; add `pgvector` for semantic
  search. Edges go in one table.
- MCP: the official MCP SDK (stdio and streamable HTTP).
- Keep it to one service for the MVP.

## 8. Phases

1. Ingest and normalize 법령/시행령/시행규칙, with 시행일자.
2. Build citation edges (intra-법령 and 위임).
3. Ship the keyless REST search and detail endpoints.
4. Ship the MCP tool and the Claude connector.
5. Add 행정규칙, 자치법규, and 법령해석례.
6. Add the free 판례 subset and 판례 → 법령 edges.

## 9. Out of scope (hold the line)

- No race with LBOX or 빅케이스 on full 판결문.
- No consumer app and no lawyer workflow tools.
- No paid tier until the free index and the MCP tool prove adoption.

## 10. Carried risk (a gate before public launch)

Confirm the reuse license (the 공공누리 type) for 법령 본문 and 판례, and the API
bulk and rate terms. The risk is low for 법령 text and higher for 판례.
