/**
 * JSON 归档存储：按文件大小自动分割，类似日志轮转
 * 使用 rotating-file-stream 实现按 size 轮转，JSONL 格式
 */
import * as path from 'path';
import * as fs from 'fs';
import { createStream } from 'rotating-file-stream';

export interface JsonArchiveRecord<T = unknown> {
    id: string;
    data: T;
    timestamp: number;
}

export interface JsonArchiveOptions {
    /** 单个文件最大字节数，超过则轮转，默认 5MB，支持 '5m','100k','1g' */
    maxSize?: string | number;
    /** 最多保留的归档文件数 */
    maxFiles?: number;
}

const DEFAULT_MAX_SIZE = '5m';
const DEFAULT_MAX_FILES = 14;

/**
 * 从目录中读取所有 JSONL 文件并合并为 Map（新记录覆盖旧记录）
 */
function loadFromDir(dirPath: string, baseName: string): Map<string, { data: string; timestamp: number }> {
    const result = new Map<string, { data: string; timestamp: number }>();
    if (!fs.existsSync(dirPath)) return result;

    const files = fs.readdirSync(dirPath)
        .filter((f) => f.startsWith(baseName) && f.endsWith('.json'))
        .map((f) => path.join(dirPath, f))
        .sort();

    for (const fp of files) {
        try {
            const raw = fs.readFileSync(fp, 'utf-8');
            const lines = raw.split('\n').filter((s) => s.trim());
            for (const line of lines) {
                try {
                    const obj = JSON.parse(line) as { id: string; data: string; timestamp: number };
                    if (obj.id != null) {
                        const existing = result.get(obj.id);
                        if (!existing || obj.timestamp >= existing.timestamp) {
                            result.set(obj.id, { data: obj.data, timestamp: obj.timestamp });
                        }
                    }
                } catch {
                    // 跳过解析失败的行
                }
            }
        } catch {
            // 跳过读取失败的文件
        }
    }
    return result;
}

export class JsonArchiveStore {
    private dirPath: string;
    private baseName: string;
    private stream: ReturnType<typeof createStream> | null = null;
    private cache = new Map<string, { data: string; timestamp: number }>();
    private maxSize: string | number;
    private maxFiles: number;

    constructor(
        dirPath: string,
        baseName: string = 'store',
        options: JsonArchiveOptions = {}
    ) {
        this.dirPath = path.resolve(dirPath);
        this.baseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
        this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
        this.maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;

        if (!fs.existsSync(this.dirPath)) {
            fs.mkdirSync(this.dirPath, { recursive: true });
        }

        this.cache = loadFromDir(this.dirPath, this.baseName);
        this.ensureStream();
    }

    private ensureStream(): void {
        if (this.stream) return;
        const sizeStr = typeof this.maxSize === 'string' ? this.maxSize : `${Math.floor(this.maxSize / 1024 / 1024)}M`;
        this.stream = createStream(
            (time: Date | number | null, index?: number) => {
                if (!time) return `${this.baseName}.json`;
                const date = typeof time === 'object' && time instanceof Date
                    ? time.toISOString().slice(0, 10)
                    : String(time).slice(0, 10);
                return `${this.baseName}.${date}.${index || 0}.json`;
            },
            {
                path: this.dirPath,
                size: sizeStr,
                maxFiles: this.maxFiles
            }
        );
    }

    private writeLine(line: string): void {
        this.ensureStream();
        this.stream!.write(line + '\n', (err: Error | null | undefined) => {
            if (err) console.error('JsonArchiveStore write error:', err);
        });
    }

    /**
     * 写入记录（插入或更新，按 id）
     */
    async write(id: string, data: unknown): Promise<void> {
        const timestamp = Date.now();
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        this.cache.set(id, { data: dataStr, timestamp });
        this.writeLine(JSON.stringify({ id, data: dataStr, timestamp }));
    }

    /**
     * 按 id 读取单条记录
     */
    async read(id: string): Promise<JsonArchiveRecord | undefined> {
        const entry = this.cache.get(id);
        if (!entry) return undefined;
        try {
            const data = entry.data.startsWith('{') || entry.data.startsWith('[')
                ? JSON.parse(entry.data)
                : entry.data;
            return { id, data, timestamp: entry.timestamp };
        } catch {
            return { id, data: entry.data, timestamp: entry.timestamp };
        }
    }

    /**
     * 读取全部记录，按 timestamp 倒序
     */
    async readAll(limit: number = 100): Promise<JsonArchiveRecord[]> {
        const entries = Array.from(this.cache.entries())
            .map(([id, e]) => {
                try {
                    const data = e.data.startsWith('{') || e.data.startsWith('[')
                        ? JSON.parse(e.data)
                        : e.data;
                    return { id, data, timestamp: e.timestamp };
                } catch {
                    return { id, data: e.data, timestamp: e.timestamp };
                }
            })
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
        return entries;
    }

    /**
     * 获取记录数
     */
    async count(): Promise<number> {
        return this.cache.size;
    }

    /**
     * 获取当前存储目录
     */
    getDirPath(): string {
        return this.dirPath;
    }

    /**
     * 关闭写入流
     */
    close(): void {
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }
        this.cache.clear();
    }
}
