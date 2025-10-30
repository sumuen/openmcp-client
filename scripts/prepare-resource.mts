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

async function copyFile(src: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFile(src, dest, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log(`Copied ${src} to ${dest}`);
                resolve();
            }
        });
    });
}
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function prepareResources() {
    try {
        // 创建资源目录
        const ocrDir = path.join(__dirname, '..', 'resources', 'ocr');
        const duckdbDir = path.join(__dirname, '..', 'resources', 'duckdb');
        
        if (!fs.existsSync(ocrDir)) {
            fs.mkdirSync(ocrDir, { recursive: true });
        }
        
        if (!fs.existsSync(duckdbDir)) {
            fs.mkdirSync(duckdbDir, { recursive: true });
        }

        // 1. 构建 tesseract.js worker
        console.log('Building tesseract.js worker...');
        await execCommand('npx rollup -c rollup.tesseract.js --bundleConfigAsCjs');

        // 2. 复制 duckdb-wasm 资源文件
        console.log('Copying duckdb-wasm resources...');
        
        const duckdbWorkerSrc = path.join(__dirname, '..', 'node_modules', '@duckdb', 'duckdb-wasm', 'dist', 'duckdb-node-mvp.worker.cjs');
        const duckdbWorkerDest = path.join(duckdbDir, 'duckdb-node-mvp.worker.cjs');
        
        const duckdbWasmSrc = path.join(__dirname, '..', 'node_modules', '@duckdb', 'duckdb-wasm', 'dist', 'duckdb-eh.wasm');
        const duckdbWasmDest = path.join(duckdbDir, 'duckdb-eh.wasm');
        
        // 检查源文件是否存在
        if (!fs.existsSync(duckdbWorkerSrc)) {
            throw new Error(`DuckDB worker file not found: ${duckdbWorkerSrc}`);
        }
        
        if (!fs.existsSync(duckdbWasmSrc)) {
            throw new Error(`DuckDB WASM file not found: ${duckdbWasmSrc}`);
        }
        
        // 复制文件
        await copyFile(duckdbWorkerSrc, duckdbWorkerDest);
        await copyFile(duckdbWasmSrc, duckdbWasmDest);
        
        console.log('All resources prepared successfully!');
    } catch (error) {
        console.error('Error preparing resources:', error);
        process.exit(1);
    }
}

// 执行资源准备
prepareResources();