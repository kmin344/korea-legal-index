#!/usr/bin/env node
// MCP server: the agent-native surface for the Korean primary-law index PoC.
// Tools:
//   search_korean_law(query, k?)  — search 법령 by name
//   get_law_resource(mst)         — fetch a law and its 조문 (full text)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchLaws, getLaw } from './api.mjs';

const server = new McpServer({ name: 'korea-law-index', version: '0.1.0' });

server.registerTool(
  'search_korean_law',
  {
    title: 'Search Korean law',
    description:
      'Search Korean statutes and regulations (법령) by name via the official law.go.kr index. ' +
      'Returns laws with canonical id, 소관부처, 시행일자 (effective date), status, and the source URL.',
    inputSchema: {
      query: z.string().describe('Law name query, e.g. "개인정보 보호법"'),
      k: z.number().int().positive().max(50).optional().describe('Max results (default 10)'),
    },
  },
  async ({ query, k }) => {
    const out = await searchLaws({ query, limit: k ?? 10 });
    return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] };
  },
);

server.registerTool(
  'get_law_resource',
  {
    title: 'Get Korean law full text',
    description:
      'Fetch one law by its MST (법령일련번호, from search results) and return its 조문 (articles) ' +
      'as full text, each with a canonical id like law:<법령ID>:조:<번호>.',
    inputSchema: {
      mst: z.string().describe('MST / 법령일련번호 from a search result'),
    },
  },
  async ({ mst }) => {
    const law = await getLaw({ mst });
    return { content: [{ type: 'text', text: JSON.stringify(law, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
