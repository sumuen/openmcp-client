import path from 'path';
import { fileURLToPath } from 'url';
import { OmAgent } from '../../../openmcp-sdk/service/sdk.js';
import { useMcpConfig } from './global.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 测试 skill 功能：当配置中包含 skillPath 时，应启用 read_skill_file 工具
 */
async function testSkill() {
    const agent = new OmAgent();
    agent.loadMcpConfig(useMcpConfig('word-mcp'));

    // 显式设置 skill 路径，验证 read_skill_file 会被启用
    const skillPath = path.resolve(__dirname, '..', 'fixtures', 'skill-test');
    agent.setSkillPath(skillPath);

    const prompt =
        '你已加载 skill-test 技能。请使用 read_skill_file 工具读取 reference.md 文件，然后简要总结其中的内容。完成后回复 "skill test ok" 即可。';

    const result = await agent.ainvoke({
        messages: prompt
    });

    console.log('skill test result: ', result);
}

testSkill();
