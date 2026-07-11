import type { Env } from '../types';
import { one, all, batch } from '../lib/db';
import { id } from '../lib/id';
import { generateBuild } from '../generate/bundle';

// SiteForge MCP server (Phase 5) — exposes core operations as MCP tools over a
// stateless Streamable-HTTP JSON-RPC endpoint (POST /mcp), so another Claude
// session can drive SiteForge: create a project, check status, trigger a build.
// Auth is the operator token (same as the dashboard), enforced by the route.

const PROTOCOL_VERSION = '2024-11-05';

interface JsonRpcReq {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

const TOOLS = [
  {
    name: 'siteforge_list_projects',
    description: 'List SiteForge projects (most recent first) with client name and status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'siteforge_create_project',
    description:
      'Create a new client project and interview session. Returns the shareable interview link the client uses to answer the intake questions.',
    inputSchema: {
      type: 'object',
      properties: {
        clientName: { type: 'string', description: 'Business / organization name (required).' },
        contactEmail: { type: 'string', description: 'Optional contact email.' },
        projectName: { type: 'string', description: 'Optional project name; defaults to "<client> website".' },
      },
      required: ['clientName'],
      additionalProperties: false,
    },
  },
  {
    name: 'siteforge_get_project',
    description: 'Get a project: status, interview progress, and number of builds.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project id (proj_...).' } },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'siteforge_generate_site',
    description:
      'Generate a new site build (preview) for a project from its interview + confirmed content. Returns the preview URL and quality score. Requires a completed interview.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id (proj_...).' },
        themeId: { type: 'string', description: 'Optional theme override: atelier | sanctuary | storefront.' },
      },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
  {
    name: 'siteforge_list_builds',
    description: 'List a project’s build versions with status, theme, quality score, and preview URLs.',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string', description: 'Project id (proj_...).' } },
      required: ['projectId'],
      additionalProperties: false,
    },
  },
] as const;

async function callTool(env: Env, name: string, args: any): Promise<unknown> {
  switch (name) {
    case 'siteforge_list_projects': {
      const rows = await all(
        env,
        `SELECT p.id, p.name, p.status, cl.name AS client_name
           FROM projects p JOIN clients cl ON cl.id = p.client_id
          ORDER BY p.created_at DESC LIMIT 50`,
      );
      return { projects: rows };
    }
    case 'siteforge_create_project': {
      const clientName = String(args?.clientName ?? '').trim();
      if (!clientName) throw new Error('clientName is required.');
      const projectName = String(args?.projectName ?? '').trim() || `${clientName} website`;
      const clientId = id('client');
      const projectId = id('proj');
      const sessionId = id('sess');
      await batch(env, [
        { sql: 'INSERT INTO clients (id, name, contact_email) VALUES (?, ?, ?)', params: [clientId, clientName, args?.contactEmail ?? null] },
        { sql: 'INSERT INTO projects (id, client_id, name) VALUES (?, ?, ?)', params: [projectId, clientId, projectName] },
        { sql: 'INSERT INTO interview_sessions (id, project_id) VALUES (?, ?)', params: [sessionId, projectId] },
      ]);
      return { projectId, interviewSessionId: sessionId, interviewUrl: `/interview.html?s=${sessionId}` };
    }
    case 'siteforge_get_project': {
      const projectId = String(args?.projectId ?? '');
      const project = await one(env, 'SELECT id, name, status, industry, tone FROM projects WHERE id = ?', projectId);
      if (!project) throw new Error(`No project ${projectId}. Use siteforge_list_projects to find valid ids.`);
      const builds = await one<{ n: number }>(env, 'SELECT COUNT(*) AS n FROM builds WHERE project_id = ?', projectId);
      return { project, buildCount: builds?.n ?? 0 };
    }
    case 'siteforge_generate_site': {
      const projectId = String(args?.projectId ?? '');
      const result = await generateBuild(env, projectId, args?.themeId ? String(args.themeId) : undefined);
      return result;
    }
    case 'siteforge_list_builds': {
      const projectId = String(args?.projectId ?? '');
      const builds = await all(
        env,
        'SELECT id, version, status, theme_id, preview_url FROM builds WHERE project_id = ? ORDER BY version DESC',
        projectId,
      );
      return { builds };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function result(id: any, data: unknown) {
  return { jsonrpc: '2.0', id, result: data };
}
function error(id: any, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// Handle one JSON-RPC request (stateless). Returns the response object, or null
// for notifications (no id) which get a 202/empty ack.
export async function handleMcp(env: Env, req: JsonRpcReq): Promise<object | null> {
  const { method, id: rid } = req;
  switch (method) {
    case 'initialize':
      return result(rid, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'siteforge', version: '0.1.0' },
      });
    case 'notifications/initialized':
      return null;
    case 'ping':
      return result(rid, {});
    case 'tools/list':
      return result(rid, { tools: TOOLS });
    case 'tools/call': {
      const name = req.params?.name;
      const args = req.params?.arguments ?? {};
      try {
        const data = await callTool(env, name, args);
        return result(rid, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
      } catch (err) {
        // MCP convention: tool errors are results with isError, not protocol errors.
        return result(rid, { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true });
      }
    }
    default:
      return error(rid, -32601, `Method not found: ${method}`);
  }
}
