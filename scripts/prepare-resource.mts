import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'child_process';

async function execCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const parts = command.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);
        
        const child = spawn(cmd, args, { 
            stdio: 'inherit',
            shell: true,
            cwd: path.join(__dirname, '..') // 设置工作目录为项目根目录
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}: ${command}`));
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function prepareResources() {
    try {
        // 创建资源目录
        const ocrDir = path.join(__dirname, '..', 'resources', 'ocr');

        if (!fs.existsSync(ocrDir)) {
            fs.mkdirSync(ocrDir, { recursive: true });
        }

        // 构建 tesseract.js worker
        console.log('Building tesseract.js worker...');
        await execCommand('npx rollup -c rollup.tesseract.js --bundleConfigAsCjs');

        console.log('All resources prepared successfully!');
    } catch (error) {
        console.error('Error preparing resources:', error);
        process.exit(1);
    }
}

// 执行资源准备
prepareResources();