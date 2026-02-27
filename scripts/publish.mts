#!/usr/bin/env npx tsx
/**
 * OpenMCP 一键构建发布脚本
 * 整合自 lagrange.RagBot openmcp-publish.ts 的逻辑
 *
 * 用法：
 *   yarn publish               # 仅构建
 *   yarn publish:update        # 更新代码后构建
 *   yarn publish:vsce         # 构建并发布到 VSCode 市场
 *   yarn publish:github       # 构建并发布 GitHub Release
 *   yarn publish:all         # 更新 + 构建 + 发布到 VSCE + GitHub
 *
 * 环境变量（可选）：
 *   DEEPSEEK_API_TOKEN - GitHub Release 英文说明翻译（未设置则使用中文）；build:news 也依赖此或 OPENAI_API_KEY
 *   VSCE_TOOL          - 覆盖 vsce 命令，默认 npx @vscode/vsce
 *
 * 额外选项：
 *   --skip-news        - 跳过 build:news（无 API Token 时可使用）
 *   --skip-check      - 跳过启动前预检查（用于 CI 等场景）
 *   --check-only      - 仅执行预检查后退出（不进行构建与发布）
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function runCheck(cmd: string, cwd = ROOT): { ok: boolean; message?: string } {
  try {
    const binPath = path.join(ROOT, 'node_modules', '.bin');
    const pathEnv = process.platform === 'win32'
      ? `${binPath};${process.env.PATH ?? process.env.Path ?? ''}`
      : `${binPath}:${process.env.PATH ?? ''}`;
    const env = { ...process.env, PATH: pathEnv, Path: pathEnv };
    const r = spawnSync(cmd, { cwd, env, shell: process.platform === 'win32', encoding: 'utf-8' });
    return { ok: r.status === 0, message: (r.stderr || r.stdout || '').trim() };
  } catch {
    return { ok: false, message: '命令无法执行' };
  }
}

function checkCommand(name: string, testCmd: string): { ok: boolean; msg?: string } {
  const r = runCheck(testCmd);
  return r.ok ? { ok: true } : { ok: false, msg: `${name}: ${r.message || '未找到'}` };
}

async function runPreflight(args: {
  doUpdate: boolean;
  skipNews: boolean;
  doPublishVsce: boolean;
  doPublishGithub: boolean;
}): Promise<void> {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('\n========== 启动前预检查 ==========\n');

  // 1. 环境变量
  if (!args.skipNews && !process.env['DEEPSEEK_API_TOKEN']?.trim()) {
    warnings.push('DEEPSEEK_API_TOKEN 未设置，build:news 将失败，建议使用 --skip-news 或设置该变量');
  }
  if (args.doPublishGithub && !process.env['DEEPSEEK_API_TOKEN']?.trim()) {
    warnings.push('DEEPSEEK_API_TOKEN 未设置，GitHub Release 将使用中文说明');
  }

  // 2. 必要文件
  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    errors.push('package.json 不存在');
  }
  if (!fs.existsSync(path.join(ROOT, 'CHANGELOG.md'))) {
    errors.push('CHANGELOG.md 不存在');
  } else {
    const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf-8');
    if (!changelog.includes('## [main]')) {
      errors.push('CHANGELOG.md 格式异常，缺少 ## [main] 区块');
    }
  }
  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    errors.push('node_modules 不存在，请先执行 yarn install');
  }

  // 3. 命令可用性（按执行流程所需）
  const binDir = path.join(ROOT, 'node_modules', '.bin');
  const turboBin = process.platform === 'win32' ? 'turbo.cmd' : 'turbo';
  const turboPath = path.join(binDir, turboBin);
  const turboOk = fs.existsSync(binDir) && (fs.existsSync(turboPath) || fs.existsSync(path.join(binDir, 'turbo')));
  if (!turboOk) errors.push('turbo: 未找到于 node_modules/.bin，请执行 yarn install');

  const commandChecks = [
    checkCommand('node', 'node --version'),
    checkCommand('yarn', 'yarn --version'),
    ...(args.doUpdate ? [checkCommand('git', 'git --version')] : []),
    checkCommand('tsc', 'npx tsc --version'),
    checkCommand('npx', 'npx --version'),
  ];
  for (const c of commandChecks) {
    if (!c.ok) errors.push(c.msg!);
  }

  if (args.doPublishVsce) {
    const vsceTool = process.env['VSCE_TOOL'] ?? 'npx @vscode/vsce';
    const vsceVer = runCheck(`${vsceTool} --version`);
    if (!vsceVer.ok) {
      errors.push(`vsce 不可用: ${vsceVer.message || vsceTool} 无法执行`);
    } else {
      const pubCheck = runCheck(`${vsceTool} ls-publishers`);
      if (!pubCheck.ok) {
        errors.push('vsce 未登录 VSCode 市场，请执行: npx @vscode/vsce login kirigaya');
      } else {
        console.log('  ✅ vsce: 已登录');
      }
    }
  }

  if (args.doPublishGithub) {
    const ghOk = runCheck('gh auth status');
    if (!ghOk.ok) {
      errors.push('gh (GitHub CLI) 未登录或未安装，请执行: gh auth login');
    } else {
      console.log('  ✅ gh: 已登录');
    }
  }

  // 4. 脚本可执行性
  const newsScript = path.join(ROOT, 'scripts', 'update-news-data.mts');
  if (!args.skipNews && !fs.existsSync(newsScript)) {
    errors.push('scripts/update-news-data.mts 不存在');
  }
  if (warnings.length > 0) {
    console.log('⚠️ 警告:\n' + warnings.map((w) => '  ' + w).join('\n') + '\n');
  }
  if (errors.length > 0) {
    console.error('❌ 预检查失败:\n' + errors.map((e) => '  ' + e).join('\n'));
    throw new Error('预检查未通过，请修正上述问题后重试。使用 --skip-check 可跳过检查');
  }
  console.log('✅ 预检查通过\n');
}

function exec(command: string, options?: { cwd?: string; env?: NodeJS.ProcessEnv }): string {
  const cwd = options?.cwd ?? ROOT;
  const env = { ...process.env, ...options?.env };
  // Windows: 确保 node_modules/.bin 在 PATH 中，以便 turbo、vsce 等可执行
  const binPath = path.join(cwd, 'node_modules', '.bin');
  if (process.platform === 'win32' && fs.existsSync(binPath)) {
    const pathEnv = env.PATH ?? env.Path ?? '';
    env.PATH = `${binPath};${pathEnv}`;
    env.Path = env.PATH;
  }
  const result = execSync(command, {
    cwd,
    env,
    encoding: 'utf-8',
    shell: process.platform === 'win32', // Windows 下使用 shell 以正确解析命令
  });
  console.log(result);
  return result;
}

function rmSync(target: string, options?: { recursive?: boolean; force?: boolean }) {
  const fullPath = path.join(ROOT, target);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true, ...options });
    console.log(`已删除: ${target}`);
  }
}

function updateOpenMCP(): void {
  console.log('\n========== 更新代码 ==========');
  try {
    exec('git stash', { cwd: ROOT });
  } catch {
    // stash 可能没有变更，忽略
  }
  exec('git pull origin main', { cwd: ROOT });
  exec('yarn install', { cwd: ROOT });
}

function buildOpenMCP(skipNews: boolean): string {
  console.log('\n========== 构建 ==========');

  // 1. 清理 openmcp-sdk（构建时会重新生成）
  rmSync('openmcp-sdk');

  // 2. 更新 news 数据
  if (!skipNews) {
    exec('yarn build:news', { cwd: ROOT });
  } else {
    console.log('跳过 build:news (--skip-news)');
  }

  // 3. 清理旧的 vsix 文件
  const vsixFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.vsix'));
  for (const f of vsixFiles) {
    rmSync(f);
  }

  // 4. 构建插件
  exec('yarn build:plugin', { cwd: ROOT });

  const vsixFile = fs.readdirSync(ROOT).find((f) => f.endsWith('.vsix'));
  if (!vsixFile) {
    throw new Error('构建失败：未找到 .vsix 文件');
  }
  return path.join(ROOT, vsixFile);
}

function getChangelogParts(): { version: string; updateContent: string } {
  const changelogPath = path.join(ROOT, 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, { encoding: 'utf-8' });
  const mainSection = changelog.split('## [main]')[1];
  if (!mainSection) {
    throw new Error('CHANGELOG.md 格式异常，未找到 ## [main] 区块');
  }
  const lines = mainSection.trim().split('\n');
  const version = lines[0]?.trim() ?? '';
  const updateContent = lines.slice(1).join('\n').trim();
  return { version, updateContent };
}

export function getLastChangeLog(): string {
  const { version, updateContent } = getChangelogParts();
  return (
    `✴️ openmcp client ${version} 更新内容\n\n` +
    updateContent +
    '\n\n在 vscode/trae/cursor 等编辑器的插件商城搜索【openmcp】就可以下载最新的版本了！'
  );
}

export function getVersion(): string {
  return getChangelogParts().version;
}

async function getChangeLogEnglish(updateContent: string): Promise<string> {
  if (!process.env['DEEPSEEK_API_TOKEN']) {
    console.warn('未设置 DEEPSEEK_API_TOKEN，跳过英文翻译');
    return updateContent;
  }

  const sdkPath = path.join(ROOT, 'openmcp-sdk', 'service', 'sdk.js');
  if (!fs.existsSync(sdkPath)) {
    console.warn('openmcp-sdk 未找到，跳过英文翻译');
    return updateContent;
  }

  try {
    const sdkUrl = pathToFileURL(sdkPath).href;
    const { OmAgent } = await import(sdkUrl);
    const agent = new OmAgent();
    agent.setDefaultLLM({
      baseURL: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apiToken: process.env['DEEPSEEK_API_TOKEN'],
    });

    const message =
      '请将下面的更新日志翻译成 GitHub release 风格的英文说明，请只返回翻译后的结果，不要出现任何多余的前缀：\n' +
      updateContent;

    const result = await agent.ainvoke({ messages: message });
    return typeof result === 'string' ? result : String(result ?? updateContent);
  } catch (err) {
    console.warn('英文翻译失败，使用中文原文:', err);
    return updateContent;
  }
}

async function publishVsix(vsixPath: string, tool = 'npx @vscode/vsce'): Promise<string> {
  if (!fs.existsSync(vsixPath)) {
    throw new Error('vsix 文件不存在');
  }
  const cmd = `${tool} publish --packagePath ${path.basename(vsixPath)}`;
  return exec(cmd, { cwd: ROOT }).trim();
}

async function publishGithubRelease(vsixPath: string): Promise<string> {
  if (!fs.existsSync(vsixPath)) {
    throw new Error('vsix 文件不存在');
  }

  const { version, updateContent } = getChangelogParts();
  const tag = 'v' + version;
  const notes = await getChangeLogEnglish(updateContent);

  const notesFile = path.join(ROOT, '.release-notes-temp.md');
  fs.writeFileSync(notesFile, notes, { encoding: 'utf-8' });
  try {
    const toolCmd = `gh release create ${tag} ${path.basename(vsixPath)} --title "openmcp client ${tag}" --notes-file "${notesFile}"`;
    return exec(toolCmd, { cwd: ROOT }).trim();
  } finally {
    fs.rmSync(notesFile, { force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const doUpdate = args.includes('--update') || args.includes('--all');
  const doPublishVsce = args.includes('--publish-vsce') || args.includes('--all');
  const doPublishGithub = args.includes('--publish-github') || args.includes('--all');
  const skipNews = args.includes('--skip-news');
  const skipCheck = args.includes('--skip-check');
  const checkOnly = args.includes('--check-only');

  if (!skipCheck) {
    await runPreflight({ doUpdate, skipNews, doPublishVsce, doPublishGithub });
  }
  if (checkOnly) {
    console.log('--check-only: 预检查已完成，退出');
    return;
  }

  if (doUpdate) {
    updateOpenMCP();
  }

  const vsixPath = buildOpenMCP(skipNews);
  console.log('\n✅ 构建成功:', vsixPath);

  if (doPublishVsce) {
    console.log('\n========== 发布到 VSCode 市场 ==========');
    const vsceTool = process.env['VSCE_TOOL'] ?? 'npx @vscode/vsce';
    await publishVsix(vsixPath, vsceTool);
    console.log('✅ VSCode 市场发布完成');
  }

  if (doPublishGithub) {
    console.log('\n========== 发布 GitHub Release ==========');
    await publishGithubRelease(vsixPath);
    console.log('✅ GitHub Release 发布完成');
  }

  if (!doPublishVsce && !doPublishGithub) {
    console.log('\n提示: 使用 --publish-vsce 发布到 VSCode 市场，--publish-github 发布 GitHub Release，--all 执行全部');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
