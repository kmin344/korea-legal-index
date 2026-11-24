# Korea market research

Date: 2026-10-22. Facts below come from web research. Items marked "verify"
are not yet confirmed from a primary source.

## 1. The official Open API (the supply)

- Portal: 국가법령정보 공동활용 at <https://open.law.go.kr/LSO/main.do>, run by
  법제처 (Ministry of Government Legislation).
- Access: free. Create an account, choose the data, and request use
  (활용신청). You pick your own API key (OC 인증키). Approval takes about 1–2
  days; one page says it is automatic.
- Endpoint pattern:
  `open.law.go.kr/LSO/openApi/guideResult.do?htmlName=<type>Guide`.
  Each data type has a 목록 (list) API and a 본문 (full-text) API.
  Confirmed examples: `ordinListGuide` (자치법규 list), `trtyInfoGuide`
  (조약 text), `mobAdmrulInfoGuide` (행정규칙 text).
- Coverage: 법령·조약, 행정규칙, 자치법규, 판례, 헌재결정례, 법령해석례,
  행정심판례, 별표·서식, 법령용어. A third party counts about 42 APIs (verify).

## 2. The decisive split: statutes are open, case law is not

| Layer | Free via the API? | Contested by incumbents? |
|---|---|---|
| 법령 / 시행령 / 시행규칙 | Yes, strong | Low |
| 행정규칙 | Yes | Low |
| 자치법규 (조례·규칙) | Yes | Low |
| 법령해석례 / 헌재 / 행정심판례 | Yes | Low |
| 판례 (full 판결문) | Partial subset only | High |

- Korean court judgment disclosure is limited by law. Historically only final
  judgments were online, criminal from 2013 and civil from 2015.
- The free 판례 API holds a curated subset (mostly 대법원 and selected cases),
  not the millions of lower-court full judgments.
- The full-judgment corpus is the incumbents' moat.

## 3. Competitors (case law)

- **LBOX / 엘박스:** reports 2.22M+ judgments, AI similar-case search, started
  2020. There is acquisition context with CaseNote.
- **빅케이스 (로앤컴퍼니):** claims about 5M 판례 (3.3M under the paid
  빅케이스Plus), case-status flags (전합/파기 등), and analytics on 840K+
  first-instance criminal judgments. 로앤컴퍼니 also runs 슈퍼로이어, a legal
  AI built on Claude/Gemini/GPT.
- Reports put LBOX + CaseNote combined at about 5M full judgments.
- **CaseNote / 케이스노트:** status conflicts across sources (one marks it
  closed; another describes a LBOX acquisition with 450K monthly users).
  Verify.

Takeaway: do not compete on case-law volume.

## 4. Prior art for the agent-native angle

- Open-source `korean-law-mcp` (MIT, ~5 stars, early stage,
  <https://github.com/seo-jinseok/korean-law-mcp>) already wraps the same API.
  It has 9 MCP tools and an `explore_legal_chain` tool that follows references
  on demand.
- It does **not** build a persistent citation graph, and it has **no** hosted
  keyless search service and **no** AI-connector distribution.
- So the Firecrawl-style parts are open: a stored normalized index with
  canonical IDs, 시행일자 (effective-date) versioning, a persistent citation
  graph, a keyless hosted search endpoint, and Claude/ChatGPT connectors.

## 5. Open risks to verify before building

1. Reuse license: the exact 공공누리 type for 법령 본문, and the reuse terms for
   판례 (check the portal terms and kogl.or.kr). 법령 text is a public work and
   is widely reused, so the risk there is low.
2. API limits: confirm rate limits and bulk-access terms for building a full
   index.
3. CaseNote status: confirm, because it changes the competitive map.

## Sources

- <https://www.firecrawl.dev/alexandria/gov-index>
- <https://open.law.go.kr/LSO/main.do> · <https://open.law.go.kr/LSO/information/guide.do>
- <https://github.com/seo-jinseok/korean-law-mcp>
- <https://thevc.kr/lbox> · <https://thevc.kr/compare/casenote-vs-lawncompany-vs-lbox>
- <https://www.lawtimes.co.kr/news/200940>
- <https://www.mt.co.kr/future/2025/08/08/2025080810014660494>
- <https://news.bizwatch.co.kr/article/industry/2021/10/27/0025>
