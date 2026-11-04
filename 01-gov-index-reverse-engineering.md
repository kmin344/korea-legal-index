# How Firecrawl gov-index works

Source page: <https://www.firecrawl.dev/alexandria/gov-index>
Reverse-engineered from: `firecrawl-cli@1.26.20` (npm), analyzed with REA
(`analyze-javascript-application`, exit 0).

## 1. Product shape

Firecrawl's "Government & Legal Index" is a search index of US law for AI
agents. It is one of three Alexandria indexes, with a Developer Index and a
Research Index. It advertises 30M+ data points: statutes, regulations, local
ordinances, zoning codes, court opinions, bills, tax forms, and agency
guidance. Each result links to its official source. The stance is "sources,
not legal advice." Search is free.

## 2. The five-part mechanism

1. **Collect.** Firecrawl crawls federal, state, county, and city government
   legal sites.
2. **Normalize.** Each legal item becomes one structured record: the verbatim
   text, a jurisdiction tag, a canonical ID, its citations, and the source URL.
3. **Build a citation graph.** Records link through "cites" and "cited-by"
   pointers. An agent can follow the graph to the controlling authority.
4. **Serve.** Free, keyless search through an MCP connector, a REST API, a
   CLI, and SDKs.
5. **Business model.** Free search is a funnel. Firecrawl earns from its wider
   crawl/scrape API and plugins.

## 3. The API contract (reverse-engineered)

Evidence files inside the package:
`dist/commands/gov.js`, `dist/types/gov.d.ts`, `dist/utils/client.js`,
`dist/index.js`.

### Endpoint and auth
- `GET /v2/search/gov` on base `https://api.firecrawl.dev`.
- The CLI appends `integration=cli`.
- Keyless by default: with no API key and no custom URL, the CLI uses a plain
  `fetch` with no auth token (`keylessGet`). This confirms "free to search."
- The three indexes share the pattern: `/v2/search/gov`,
  `/v2/search/developer`, `/v2/search/research`.

### Request parameters (`GovSearchOptions`, `FILTERS`)
- `query` (required)
- `k` (result count; the CLI `--limit` maps here)
- `jurisdiction`
- `court`
- `courtType`
- `cites` (filter: documents that cite a given authority)
- `domain` (site filter)

### Response type (`GovSearchResponse`)
```
{ success: boolean, error?: string, data?: { web?: GovResult[] } }
GovResult = { url, title?, description?, position? }
```

### Entry points
- `firecrawl gov "<query>"`
- `firecrawl search --categories gov` (gov cannot combine with other
  categories)

## 4. The key finding

The CLI's typed response is **thin**: only `url`, `title`, `description`,
`position`.

The rich citation-web fields from the marketing page — the canonical ID
(`cited_as`), `cites`, `cited_by`, and per-result `jurisdiction` — are **not**
in the CLI's `GovResult` type. `cites` is a request filter here, not a
response field.

So the citation graph is built and held **server-side**. The CLI is a thin
keyless GET wrapper. Cloning the client is trivial. Building the index and the
graph is the real work.
