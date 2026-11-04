#!/usr/bin/env node
// CLI for the Korean primary-law index PoC.
// Usage:
//   node src/cli.mjs search "<query>" [--limit N] [--json]
//   node src/cli.mjs get <MST> [--articles] [--limit N] [--json]
import { searchLaws, getLaw, ocLabel } from './api.mjs';

function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const nxt = argv[i + 1];
      if (nxt != null && !nxt.startsWith('--')) {
        flags[key] = nxt;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      pos.push(a);
    }
  }
  return { flags, pos };
}

function usage() {
  console.log(`korea-law — Korean primary-law index PoC (OC=${ocLabel})

Commands:
  search "<query>" [--limit N] [--json]   Search 법령 by name
  get <MST> [--articles] [--limit N] [--json]   Fetch a law and its 조문

Env:
  OPEN_LAW_OC   your law.go.kr OC 인증키 (required; free at open.law.go.kr,
                register your IP or domain with the key)
`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, pos } = parseArgs(rest);

  if (!cmd || cmd === 'help' || flags.help) {
    usage();
    return;
  }

  if (cmd === 'search') {
    const query = pos.join(' ').trim();
    if (!query) throw new Error('search needs a query, e.g. search "민법"');
    const limit = Number(flags.limit ?? 10);
    const out = await searchLaws({ query, limit });
    if (flags.json) {
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    console.log(`"${out.query}" — ${out.total} 건 (상위 ${out.count}건 표시)\n`);
    for (const r of out.results) {
      console.log(`${r.title}  [${r.type ?? '-'}, ${r.status ?? '-'}]`);
      console.log(`  MST ${r.mst} · ${r.id} · 소관 ${r.issuer ?? '-'} · 시행 ${r.effectiveDate ?? '-'}`);
      console.log(`  ${r.sourceUrl}`);
    }
    return;
  }

  if (cmd === 'get') {
    const mst = pos[0];
    if (!mst) throw new Error('get needs an MST (법령일련번호), e.g. get 188376');
    const law = await getLaw({ mst });
    if (flags.json) {
      console.log(JSON.stringify(law, null, 2));
      return;
    }
    console.log(`${law.title}  [${law.type ?? '-'}]`);
    console.log(`${law.id} · MST ${law.mst} · 소관 ${law.issuer ?? '-'} · 시행 ${law.effectiveDate ?? '-'}`);
    console.log(`${law.sourceUrl}`);
    console.log(`조문 ${law.articleCount}개\n`);
    if (flags.articles) {
      const limit = Number(flags.limit ?? 5);
      for (const a of law.articles.slice(0, limit)) {
        console.log(`[${a.canonicalId}] ${a.title ?? ''}`.trim());
        console.log(a.text.split('\n').map((l) => '  ' + l).join('\n'));
        console.log('');
      }
      if (law.articles.length > limit) {
        console.log(`... ${law.articles.length - limit}개 더 (--limit 로 늘리기)`);
      }
    }
    return;
  }

  usage();
  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
