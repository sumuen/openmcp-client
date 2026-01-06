import { OmAgent } from '../../../openmcp-sdk/service/sdk.js';
import { useMcpConfig } from './global.js';

async function downloadImageToBase64(url: string): Promise<string> {
    const https = await import('https');
    const http = await import('http');

    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;

        client.get(url, (res) => {
            const chunks: Buffer[] = [];

            res.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                resolve(base64);
            });

            res.on('error', (err) => {
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}


// 添加一个测试函数用于演示下载图片并转换为 base64
async function test() {
    const imageUrl = 'https://kirigaya.cn/api/storage/image/b1b94c85-3aac-4afe-be75-141ae846926b.webp';
    console.log('开始下载图片...');
    const base64String = await downloadImageToBase64(imageUrl);
    console.log(`图片已转换为 base64，长度: ${base64String.length} 字符`);

    // 将 base64 字符串添加到查询中，模拟超大文本场景
    const largeContent = `请分析这个图片的 base64 编码内容:\n\n${base64String}`;
    
    const agent = new OmAgent();
    agent.loadMcpConfig(useMcpConfig('simple-mcp'));
    const query = largeContent;

    const result = await agent.ainvoke({
        messages: query,
    });
}

async function testDoc(userInput: string) {
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

// 运行新的测试（下载图片并转换为 base64）
async function main() {
    await test();
    await testDoc('请帮我生成一份基础的介绍 java 的学习路径的文档');
}

main();