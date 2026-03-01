/**
 * OpenMCP Debugger MCP 工具测试脚本
 *
 * 通过 Streamable HTTP 连接 OpenMCP Debugger MCP，测试其提供的工具。
 *
 * 前置条件:
 * 1. 在 Cursor/VSCode 中启动 OpenMCP 插件
 * 2. 在 OpenMCP 设置中启用 "OpenMCP Debugger MCP"
 * 3. (可选) 在 OpenMCP 中连接至少一个 MCP 服务器，如 servers/main.py
 *
 * 运行: npx tsx scripts/test-debugger-mcp.mts
 * 或:   OPENMCP_DEBUGGER_URL=http://127.0.0.1:1146/mcp npx tsx scripts/test-debugger-mcp.mts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const DEFAULT_URL = 'http://127.0.0.1:1145/mcp';

async function main() {
  const url = process.env.OPENMCP_DEBUGGER_URL || DEFAULT_URL;
  console.log('🔌 连接 OpenMCP Debugger MCP:', url);

  const client = new Client(
    { name: 'openmcp-debugger-test', version: '0.1.0' },
    { capabilities: { tools: {}, prompts: {}, resources: {} } }
  );

  const transport = new StreamableHTTPClientTransport(new URL(url));
  await client.connect(transport);

  try {
    // 1. 列出 Debugger MCP 自身的工具
    const toolsRes = await client.listTools();
    const tools = toolsRes?.tools ?? [];
    console.log('\n📋 Debugger MCP 暴露的工具:');
    tools.forEach((t) => {
      console.log(`  - ${t.name}: ${t.description ?? '(无描述)'}`);
    });

    if (tools.length === 0) {
      console.log('\n⚠️ 未发现工具，请确认:');
      console.log('  1. OpenMCP 插件已启动');
      console.log('  2. 设置中已启用 OpenMCP Debugger MCP');
      console.log('  3. 至少启用了一个 Debugger MCP 工具');
      return;
    }

    // 2. 调用 openmcp_debugger_list_all_tools 列出所有已连接 MCP 的工具
    const hasListAllTools = tools.some((t) => t.name === 'openmcp_debugger_list_all_tools');
    if (hasListAllTools) {
      console.log('\n🔧 调用 openmcp_debugger_list_all_tools...');
      const listRes = await client.callTool({
        name: 'openmcp_debugger_list_all_tools',
        arguments: {},
      });
      const text = (listRes.content ?? [])
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      const parsed = JSON.parse(text || '{}');
      const allTools = parsed.tools ?? [];
      console.log('已连接 MCP 的工具数量:', allTools.length);
      if (allTools.length > 0) {
        allTools.slice(0, 10).forEach((t: any) => {
          console.log(`  [${t.clientId}] ${t.serverName} - ${t.name}: ${t.description ?? ''}`);
        });
        if (allTools.length > 10) {
          console.log(`  ... 还有 ${allTools.length - 10} 个`);
        }

        // 3. 若有 add 工具，执行 3+5 测试
        const addTool = allTools.find((t: any) => t.name === 'add');
        if (addTool && tools.some((t) => t.name === 'openmcp_debugger_execute_tool')) {
          console.log('\n🔧 调用 openmcp_debugger_execute_tool (add 3+5)...');
          const execRes = await client.callTool({
            name: 'openmcp_debugger_execute_tool',
            arguments: {
              clientId: addTool.clientId,
              toolName: 'add',
              toolArgs: { a: 3, b: 5 },
            },
          });
          const execText = (execRes.content ?? [])
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n');
          console.log('执行结果:', execText);
        }
      } else {
        console.log('  (当前没有已连接的 MCP 服务器)');
      }
    }

    console.log('\n✅ OpenMCP Debugger MCP 测试完成');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌ 测试失败:', err);
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('\n请确认 OpenMCP Debugger MCP 已启动 (OpenMCP 插件 -> 设置 -> 启用 Debugger MCP)');
  }
  process.exit(1);
});
