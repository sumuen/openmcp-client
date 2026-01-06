import { OmAgent } from '../../../openmcp-sdk/service/sdk.js';
import { useMcpConfig } from './global.js';

async function test(userInput: string) {
    const agent = new OmAgent();
    agent.loadMcpConfig(useMcpConfig('word-mcp'));
    const prompt = await agent.getPrompt('word_operations_prompt', {});
    const query = prompt + '\n' + userInput;

    const result = await agent.ainvoke({
        messages: query,
        until: { toolName: 'word_save_document' },
        reflux: {
            enabled: true,
            saveDir: './dataset'
        }
    });
}

async function main() {
    await test('请帮我生成一份基础的介绍 python 学习路径的文档');
    await test('请帮我生成一份基础的介绍 java 的学习路径的文档');
    await test('请帮我生成一份基础的介绍 java 的学习路径的文档');
    await test('请帮我生成一份基础的介绍 java 的学习路径的文档');
    await test('请帮我生成一份基础的介绍 java 的学习路径的文档');
    await test('请帮我生成一份基础的介绍 java 的学习路径的文档');
}

main();