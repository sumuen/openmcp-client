import duckdb from 'duckdb';

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { VSCODE_WORKSPACE } from '../hook/setting.js';
import { ChatStorage, TokenConsumption } from './reflux.dto.js';

export class RefluxDB {
    private db: duckdb.Database;
    private connection: duckdb.Connection;
    private dbPath: string;

    constructor(tableName: string = 'storage') {
        const dbDir = path.join(VSCODE_WORKSPACE, '.openmcp', 'data');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.dbPath = path.join(dbDir, `${tableName}.duckdb`);
        this.db = new duckdb.Database(this.dbPath);
        this.connection = this.db.connect();

        this.initTable();
    }

    private initTable() {
        // 创建 chat_storage 表
        this.connection.run(`
            CREATE TABLE IF NOT EXISTS chat_storage (
                id VARCHAR PRIMARY KEY,
                messages JSON,
                modelIndex INTEGER,
                systemPrompt VARCHAR,
                enableToolsHash VARCHAR,
                temperature DOUBLE,
                enableWebSearch BOOLEAN,
                contextLength INTEGER,
                parallelToolCalls BOOLEAN,
                enableXmlWrapper BOOLEAN,
                trace VARCHAR,
                tokenTotal INTEGER,
                tokenInput INTEGER,
                tokenOutput INTEGER,
                tokenCacheRatio DOUBLE,
                timestamp BIGINT
            )
        `);
        
        // 创建 enable_tools 表
        this.connection.run(`
            CREATE TABLE IF NOT EXISTS enable_tools (
                hash VARCHAR PRIMARY KEY,
                tools JSON
            )
        `);
        
        // 为 trace 字段创建索引
        this.connection.run(`
            CREATE INDEX IF NOT EXISTS idx_chat_storage_trace ON chat_storage(trace)
        `);
        
        // 为 enableToolsHash 字段创建索引
        this.connection.run(`
            CREATE INDEX IF NOT EXISTS idx_chat_storage_enable_tools_hash ON chat_storage(enableToolsHash)
        `);
    }

    async insert(id: string, record: ChatStorage, trace: string, tokenConsumption: TokenConsumption): Promise<void> {
        const timestamp = Date.now();
        const settings = record.settings;
        
        // 计算 enableTools 的 hash 值
        const enableToolsString = JSON.stringify(settings.enableTools);
        const enableToolsHash = crypto.createHash('md5').update(enableToolsString).digest('hex');
        
        return new Promise((resolve, reject) => {
            // 开始一个事务
            this.connection.exec('BEGIN TRANSACTION', (err) => {
                if (err) return reject(err);
                
                // 首先插入或替换 enable_tools 表中的记录
                this.connection.run(
                    `INSERT OR REPLACE INTO enable_tools (hash, tools) VALUES (?, ?)`,
                    [
                        enableToolsHash,
                        enableToolsString
                    ],
                    (err: duckdb.DuckDbError | null) => {
                        if (err) {
                            this.connection.exec('ROLLBACK', () => reject(err));
                            return;
                        }
                        
                        // 然后插入或替换 chat_storage 表中的记录
                        this.connection.run(
                            `INSERT OR REPLACE INTO chat_storage (
                                id, messages, modelIndex, systemPrompt, enableToolsHash, temperature,
                                enableWebSearch, contextLength, parallelToolCalls, enableXmlWrapper,
                                trace, tokenTotal, tokenInput, tokenOutput, tokenCacheRatio, timestamp
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                id,
                                JSON.stringify(record.messages),
                                settings.modelIndex,
                                settings.systemPrompt,
                                enableToolsHash,
                                settings.temperature,
                                settings.enableWebSearch,
                                settings.contextLength,
                                settings.parallelToolCalls,
                                settings.enableXmlWrapper,
                                trace,
                                tokenConsumption.total,
                                tokenConsumption.input,
                                tokenConsumption.output,
                                tokenConsumption.cacheRatio,
                                timestamp
                            ],
                            (err: duckdb.DuckDbError | null) => {
                                if (err) {
                                    this.connection.exec('ROLLBACK', () => reject(err));
                                    return;
                                }
                                
                                // 提交事务
                                this.connection.exec('COMMIT', (err) => {
                                    if (err) {
                                        this.connection.exec('ROLLBACK', () => reject(err));
                                        return;
                                    }
                                    resolve();
                                });
                            }
                        );
                    }
                );
            });
        });
    }

    async findById(id: string): Promise<ChatStorage | undefined> {
        return new Promise((resolve, reject) => {
            this.connection.all(
                `SELECT cs.*, et.tools as enableTools FROM chat_storage cs 
                 LEFT JOIN enable_tools et ON cs.enableToolsHash = et.hash 
                 WHERE cs.id = ?`,
                [id],
                (err, rows) => {
                    if (err) return reject(err);
                    if (!rows || !rows.length) return resolve(undefined);
                    const row = rows[0];
                    resolve({
                        id: id,
                        messages: JSON.parse(row.messages),
                        settings: {
                            modelIndex: row.modelIndex,
                            systemPrompt: row.systemPrompt,
                            enableTools: row.enableTools ? JSON.parse(row.enableTools) : [],
                            temperature: row.temperature,
                            enableWebSearch: row.enableWebSearch,
                            contextLength: row.contextLength,
                            parallelToolCalls: row.parallelToolCalls,
                            enableXmlWrapper: row.enableXmlWrapper
                        },
                        parallelMode: undefined,
                        parallelChats: undefined,
                        selectedModels: undefined
                    });
                }
            );
        });
    }

    async findAll(): Promise<{id: string, data: ChatStorage, timestamp: number}[]> {
        return new Promise((resolve, reject) => {
            this.connection.all(
                `SELECT cs.*, et.tools as enableTools FROM chat_storage cs 
                 LEFT JOIN enable_tools et ON cs.enableToolsHash = et.hash 
                 ORDER BY cs.timestamp DESC`,
                [],
                (err, rows) => {
                    if (err) return reject(err);
                    resolve((rows ?? []).map(row => ({
                        id: row.id,
                        data: {
                            id: row.id,
                            messages: JSON.parse(row.messages),
                            settings: {
                                modelIndex: row.modelIndex,
                                systemPrompt: row.systemPrompt,
                                enableTools: row.enableTools ? JSON.parse(row.enableTools) : [],
                                temperature: row.temperature,
                                enableWebSearch: row.enableWebSearch,
                                contextLength: row.contextLength,
                                parallelToolCalls: row.parallelToolCalls,
                                enableXmlWrapper: row.enableXmlWrapper
                            },
                            parallelMode: undefined,
                            parallelChats: undefined,
                            selectedModels: undefined
                        },
                        timestamp: row.timestamp
                    })));
                }
            );
        });
    }

    async delete(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.run(
                `DELETE FROM chat_storage WHERE id = ?`,
                [id],
                (err) => (err ? reject(err) : resolve())
            );
        });
    }

    async update(id: string, record: Partial<ChatStorage>, trace: string, tokenConsumption: TokenConsumption): Promise<void> {
        // 先获取现有记录
        const existing = await this.findById(id);
        if (!existing) {
            throw new Error(`Record with id ${id} not found`);
        }

        // 合并更新
        const updatedRecord: ChatStorage = {
            id: id,
            messages: record.messages || existing.messages,
            settings: {
                ...existing.settings,
                ...record.settings
            },
            parallelMode: record.parallelMode !== undefined ? record.parallelMode : existing.parallelMode,
            parallelChats: record.parallelChats || existing.parallelChats,
            selectedModels: record.selectedModels || existing.selectedModels
        };
        
        // 使用 insert 方法更新记录
        return this.insert(id, updatedRecord, trace, tokenConsumption);
    }

    async close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.close((err) => {
                if (err) reject(err);
                else this.db.close((e) => (e ? reject(e) : resolve()));
            });
        });
    }

    getDbPath(): string {
        return this.dbPath;
    }
}

export class RefluxDBManagement {
    private refluxDbs = new Map<string, RefluxDB>;
    constructor() {}

    public get(name: string): RefluxDB {
        if (!this.refluxDbs.has(name)) {
            this.refluxDbs.set(name, new RefluxDB(name));
        }
        return this.refluxDbs.get(name)!;
    }

    async close() {
        await Promise.all(
            [...this.refluxDbs.values()].map(db => db.close())
        );
    }
}

export const refluxDBManagement = new RefluxDBManagement();