import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { JsonArchiveStore } from '../common/json-archive-store.js';
import { REFLUX_HOME, VSCODE_WORKSPACE } from '../hook/setting.js';
import { ChatStorage, TokenConsumption } from './reflux.dto.js';

interface ChatStorageRow {
    id: string;
    messages: string;
    modelIndex: number | null;
    systemPrompt: string;
    enableToolsHash: string;
    temperature: number;
    enableWebSearch: number;
    contextLength: number;
    parallelToolCalls: number;
    enableXmlWrapper: number;
    traceHash: string;
    tokenTotal: number;
    tokenInput: number;
    tokenOutput: number;
    tokenCacheRatio: number;
    timestamp: number;
}

export class RefluxDB {
    private chatStore: JsonArchiveStore;
    private enableToolsStore: JsonArchiveStore;
    private traceStore: JsonArchiveStore;
    private baseDir: string;

    constructor(tableName: string = 'storage') {
        const dbDir = REFLUX_HOME || path.join(VSCODE_WORKSPACE || process.cwd(), '.openmcp', 'data');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        this.baseDir = path.join(dbDir, `reflux-${tableName}`);
        this.chatStore = new JsonArchiveStore(this.baseDir, 'chat', { maxSize: '5m', maxFiles: 14 });
        this.enableToolsStore = new JsonArchiveStore(this.baseDir, 'enable_tools', { maxSize: '2m', maxFiles: 14 });
        this.traceStore = new JsonArchiveStore(this.baseDir, 'trace', { maxSize: '2m', maxFiles: 14 });
    }

    async insert(id: string, record: ChatStorage, trace: string, tokenConsumption: TokenConsumption): Promise<void> {
        const timestamp = Date.now();
        const settings = record.settings;
        const enableToolsString = JSON.stringify(settings.enableTools);
        const enableToolsHash = crypto.createHash('md5').update(enableToolsString).digest('hex');
        const traceHash = crypto.createHash('md5').update(trace).digest('hex');

        await this.enableToolsStore.write(enableToolsHash, enableToolsString);
        await this.traceStore.write(traceHash, trace);

        const row: ChatStorageRow = {
            id,
            messages: JSON.stringify(record.messages),
            modelIndex: settings.modelIndex !== undefined ? settings.modelIndex : null,
            systemPrompt: settings.systemPrompt || '',
            enableToolsHash,
            temperature: settings.temperature,
            enableWebSearch: settings.enableWebSearch ? 1 : 0,
            contextLength: settings.contextLength,
            parallelToolCalls: settings.parallelToolCalls ? 1 : 0,
            enableXmlWrapper: settings.enableXmlWrapper ? 1 : 0,
            traceHash,
            tokenTotal: tokenConsumption.total,
            tokenInput: tokenConsumption.input,
            tokenOutput: tokenConsumption.output,
            tokenCacheRatio: tokenConsumption.cacheRatio,
            timestamp
        };
        await this.chatStore.write(id, row);
    }

    async findById(id: string): Promise<ChatStorage | undefined> {
        const rowRec = await this.chatStore.read(id);
        if (!rowRec) return undefined;
        const row = rowRec.data as ChatStorageRow;

        const enableToolsRec = await this.enableToolsStore.read(row.enableToolsHash);
        const traceRec = await this.traceStore.read(row.traceHash);

        return {
            id,
            messages: JSON.parse(row.messages),
            settings: {
                modelIndex: row.modelIndex ?? undefined,
                systemPrompt: row.systemPrompt,
                enableTools: enableToolsRec ? (JSON.parse((enableToolsRec.data as string) || '[]')) : [],
                temperature: row.temperature,
                enableWebSearch: row.enableWebSearch === 1,
                contextLength: row.contextLength,
                parallelToolCalls: row.parallelToolCalls === 1,
                enableXmlWrapper: row.enableXmlWrapper === 1
            },
            parallelMode: undefined,
            parallelChats: undefined,
            selectedModels: undefined
        };
    }

    async count(): Promise<number> {
        return this.chatStore.count();
    }

    async findAll(page: number = 1, pageSize: number = 15) {
        const all = await this.chatStore.readAll(10000);
        const offset = (page - 1) * pageSize;
        const rows = all.slice(offset, offset + pageSize);

        const data = await Promise.all(
            rows.map(async (rowRec) => {
                const row = rowRec.data as ChatStorageRow;
                const enableToolsRec = await this.enableToolsStore.read(row.enableToolsHash);
                return {
                    id: row.id,
                    data: {
                        id: row.id,
                        messages: JSON.parse(row.messages),
                        settings: {
                            modelIndex: row.modelIndex ?? undefined,
                            systemPrompt: row.systemPrompt,
                            enableTools: enableToolsRec ? JSON.parse((enableToolsRec.data as string) || '[]') : [],
                            temperature: row.temperature,
                            enableWebSearch: row.enableWebSearch === 1,
                            contextLength: row.contextLength,
                            parallelToolCalls: row.parallelToolCalls === 1,
                            enableXmlWrapper: row.enableXmlWrapper === 1
                        },
                        parallelMode: undefined,
                        parallelChats: undefined,
                        selectedModels: undefined
                    },
                    timestamp: row.timestamp
                };
            })
        );

        return { data, page, pageSize };
    }

    async delete(id: string): Promise<void> {
        // JsonArchiveStore 为追加型，不支持物理删除，可标记删除或忽略
        // 为保持 API 兼容，此处为 no-op，或可扩展支持 delete 标记
    }

    async findEnableToolsByHash(hash: string): Promise<any[] | undefined> {
        const rec = await this.enableToolsStore.read(hash);
        if (!rec) return undefined;
        return JSON.parse((rec.data as string) || '[]');
    }

    async findTraceByHash(hash: string): Promise<string | undefined> {
        const rec = await this.traceStore.read(hash);
        if (!rec) return undefined;
        return rec.data as string;
    }

    async update(id: string, record: Partial<ChatStorage>, trace: string, tokenConsumption: TokenConsumption): Promise<void> {
        const existing = await this.findById(id);
        if (!existing) throw new Error(`Record with id ${id} not found`);
        const merged: ChatStorage = {
            id,
            messages: record.messages || existing.messages,
            settings: { ...existing.settings, ...record.settings },
            parallelMode: record.parallelMode !== undefined ? record.parallelMode : existing.parallelMode,
            parallelChats: record.parallelChats || existing.parallelChats,
            selectedModels: record.selectedModels || existing.selectedModels
        };
        return this.insert(id, merged, trace, tokenConsumption);
    }

    async close(): Promise<void> {
        this.chatStore.close();
        this.enableToolsStore.close();
        this.traceStore.close();
    }

    getDbPath(): string {
        return this.baseDir;
    }
}

export class RefluxDBManagement {
    private refluxDbs = new Map<string, RefluxDB>();

    public get(name: string): RefluxDB {
        if (!this.refluxDbs.has(name)) {
            this.refluxDbs.set(name, new RefluxDB(name));
        }
        return this.refluxDbs.get(name)!;
    }

    async close() {
        await Promise.all([...this.refluxDbs.values()].map((db) => db.close()));
        this.refluxDbs.clear();
    }
}

export const refluxDBManagement = new RefluxDBManagement();
