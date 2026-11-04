# Korea Legal Index

A research record and build plan for a Korean-market service modeled on
Firecrawl Alexandria's **Government & Legal Index** (gov-index): an
agent-native, free-to-search, citation-linked index of Korean primary law,
exposed through a REST API and an MCP (Model Context Protocol) server.

Date: 2026-10-22

## Contents

1. [01-gov-index-reverse-engineering.md](01-gov-index-reverse-engineering.md)
   — How Firecrawl's gov-index works. The API contract, reverse-engineered
   from the shipped `firecrawl-cli@1.26.20` package with REA.
2. [02-korea-market-research.md](02-korea-market-research.md)
   — The Korean supply side: the official Open API, case-law limits, the
   competitors, prior art, and the open risks.
3. [03-build-plan.md](03-build-plan.md)
   — The MVP architecture, data model, citation graph, serving surface, and
   phases.

## One-line summary

The gov-index client is a thin, keyless HTTP wrapper. The defensible asset is
the server-side normalized index and the citation graph. In Korea, statutes
and regulations are well supplied by a free official API, but full case law
(판례) is the incumbents' moat. So the wedge is a free, citation-linked index
of Korean **primary law** for developers and AI builders, not a case-law race.

## The PoC

A working proof of concept is in [poc/](poc/). It covers 법령 (statutes) through
a CLI, a REST service, and an MCP server. It needs a free OC 인증키 from
<https://open.law.go.kr> with your IP or domain registered. See
[poc/README.md](poc/README.md).

## License

This software is under the MIT License. See [LICENSE](LICENSE).

The MIT license covers only the code in this repository. It does not cover the
legal data from law.go.kr. See [NOTICE](NOTICE) for the data source terms.

## Data source and attribution

This project reads Korean law through the official API of the National Law
Information Center (국가법령정보, 법제처). The repository bundles no legal text.
Korean statutes and court decisions are not protected by copyright (저작권법
제7조), and the Public Data Act guarantees free use, commercial use included.
You must still not alter the text, must stay within the API rate limits, and
should attribute the source. See [NOTICE](NOTICE) for the verified terms.

## Disclaimer

This project provides sources, not legal advice.

## No affiliation

This project is independent.
