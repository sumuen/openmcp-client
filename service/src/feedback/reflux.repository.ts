import duckdb from 'duckdb';

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

import chalk from 'chalk';

import { REFLUX_HOME, VSCODE_WORKSPACE } from '../hook/setting.js';
import { ChatStorage, TokenConsumption } from './reflux.dto.js';
import { logTimeStampString } from '../hook/util.js';

export class RefluxDB {
    private db: duckdb.Database;
    private dbPath: string;

    constructor(tableName: string = 'storage') {
        const dbDir = REFLUX_HOME || path.join(VSCODE_WORKSPACE, '.openmcp', 'data');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.dbPath = path.join(dbDir, `${tableName}.reflux.omdb`);
        this.db = new duckdb.Database(this.dbPath);
        console.log(
            chalk.gray(`${logTimeStampString()} |`),
            'connect reflux db ' + this.dbPath
        );

        this.initTable();
    }

    private initTable() {
        const connection = this.db.connect();

        // 创建 chat_storage 表
        connection.run(`
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
                traceHash VARCHAR,
                tokenTotal INTEGER,
                tokenInput INTEGER,
                tokenOutput INTEGER,
                tokenCacheRatio DOUBLE,
                timestamp BIGINT
            )
        `);

        // 确保 traceHash 列存在（兼容已存在的表）
        try {
            connection.run(`ALTER TABLE chat_storage ADD COLUMN IF NOT EXISTS traceHash VARCHAR`);
        } catch (e) {
            // 列可能已经存在，忽略错误
            console.log('traceHash column already exists or failed to add');
        }

        // 创建 enable_tools 表
        connection.run(`
            CREATE TABLE IF NOT EXISTS enable_tools (
                hash VARCHAR PRIMARY KEY,
                tools JSON
            )
        `);

        // 创建 trace 表
        connection.run(`
            CREATE TABLE IF NOT EXISTS trace_data (
                hash VARCHAR PRIMARY KEY,
                rawString VARCHAR
            )
        `);

        // 为 traceHash 字段创建索引
        connection.run(`
            CREATE INDEX IF NOT EXISTS idx_chat_storage_trace_hash ON chat_storage(traceHash)
        `);

        // 为 enableToolsHash 字段创建索引
        connection.run(`
            CREATE INDEX IF NOT EXISTS idx_chat_storage_enable_tools_hash ON chat_storage(enableToolsHash)
        `);

        connection.close();
    }

    private async runAsync(sql: string, ...params: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const connection = this.db.connect();
            connection.all(sql, ...params, (err, rows) => {
                connection.close();
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
    }

    private async runAsyncWithoutResult(sql: string, ...params: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const connection = this.db.connect();
            connection.run(sql, ...params, (err) => {
                connection.close();
                if (err) return reject(err);
                resolve();
            });
        });
    }

    async insert(id: string, record: ChatStorage, trace: string, tokenConsumption: TokenConsumption): Promise<void> {
        const timestamp = Date.now();
        const settings = record.settings;

        // 计算 enableTools 的 hash 值
        const enableToolsString = JSON.stringify(settings.enableTools);
        const enableToolsHash = crypto.createHash('md5').update(enableToolsString).digest('hex');

        // 计算 trace 的 hash 值
        const traceHash = crypto.createHash('md5').update(trace).digest('hex');

        try {
            await this.runAsyncWithoutResult(
                `INSERT OR REPLACE INTO enable_tools (hash, tools) VALUES (?, ?)`,
                enableToolsHash,
                enableToolsString
            );

            // 插入 trace 数据
            await this.runAsyncWithoutResult(
                `INSERT OR REPLACE INTO trace_data (hash, rawString) VALUES (?, ?)`,
                traceHash,
                trace
            );

            await this.runAsyncWithoutResult(
                `INSERT OR REPLACE INTO chat_storage (
                id, messages, modelIndex, systemPrompt, enableToolsHash, temperature,
                enableWebSearch, contextLength, parallelToolCalls, enableXmlWrapper,
                traceHash, tokenTotal, tokenInput, tokenOutput, tokenCacheRatio, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                id,                                     // 1
                JSON.stringify(record.messages),        // 2
                settings.modelIndex !== undefined ? settings.modelIndex : null,  // 3
                settings.systemPrompt || '',            // 4
                enableToolsHash,                        // 5
                settings.temperature,                   // 6
                settings.enableWebSearch ? 1 : 0,       // 7 (转换为数字)
                settings.contextLength,                 // 8
                settings.parallelToolCalls ? 1 : 0,     // 9 (转换为数字)
                settings.enableXmlWrapper ? 1 : 0,      // 10 (转换为数字)
                traceHash,                              // 11
                tokenConsumption.total,                 // 12
                tokenConsumption.input,                 // 13
                tokenConsumption.output,                // 14
                tokenConsumption.cacheRatio,            // 15
                timestamp                               // 16
            );

            // 执行检查点确保数据写入磁盘
            await this.runAsyncWithoutResult('CHECKPOINT;');
        } catch (error) {
            console.error('Error inserting data into database:', error);
            throw error;
        }
    }

    async findById(id: string): Promise<ChatStorage | undefined> {
        try {
            const rows = await this.runAsync(
                `SELECT cs.*, et.tools as enableTools, td.rawString as trace FROM chat_storage cs 
                 LEFT JOIN enable_tools et ON cs.enableToolsHash = et.hash 
                 LEFT JOIN trace_data td ON cs.traceHash = td.hash
                 WHERE cs.id = ?`,
                id
            );

            if (!rows.length) return undefined;

            const row = rows[0];
            return {
                id: id,
                messages: JSON.parse(row.messages),
                settings: {
                    modelIndex: row.modelIndex,
                    systemPrompt: row.systemPrompt,
                    enableTools: row.enableTools ? JSON.parse(row.enableTools) : [],
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
        } catch (error) {
            console.error('Error finding data by id:', error);
            throw error;
        }
    }

    async count(): Promise<number> {
        // 获取总记录数
        const countRows = await this.runAsync(
            `SELECT COUNT(*) as total FROM chat_storage`
        );
        const total = countRows[0]?.total || 0;
        return Number(total);
    }

    async findAll(page: number = 1, pageSize: number = 15) {
        try {
            // 计算偏移量
            const offset = (page - 1) * pageSize;

            // 获取分页数据
            const rows = await this.runAsync(
                `SELECT cs.*, et.tools as enableTools, td.rawString as trace FROM chat_storage cs 
                 LEFT JOIN enable_tools et ON cs.enableToolsHash = et.hash 
                 LEFT JOIN trace_data td ON cs.traceHash = td.hash
                 ORDER BY cs.timestamp DESC
                 LIMIT ? OFFSET ?`,
                pageSize,
                offset
            );

            const data = (rows || []).map(row => ({
                id: row.id,
                data: {
                    id: row.id,
                    messages: JSON.parse(row.messages),
                    settings: {
                        modelIndex: row.modelIndex,
                        systemPrompt: row.systemPrompt,
                        enableTools: row.enableTools ? JSON.parse(row.enableTools) : [],
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
                timestamp: Number(row.timestamp)  // 将BigInt转换为number
            }));

            return {
                data,
                page,
                pageSize
            };
        } catch (error) {
            console.error('Error finding all data:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.runAsyncWithoutResult(
                `DELETE FROM chat_storage WHERE id = ?`,
                id
            );
        } catch (error) {
            console.error('Error deleting data by id:', error);
            throw error;
        }
    }

    async findEnableToolsByHash(hash: string): Promise<any[] | undefined> {
        try {
            const rows = await this.runAsync(
                `SELECT tools FROM enable_tools WHERE hash = ?`,
                hash
            );

            if (!rows.length) return undefined;

            return JSON.parse(rows[0].tools);
        } catch (error) {
            console.error('Error finding enable tools by hash:', error);
            throw error;
        }
    }

    async findTraceByHash(hash: string): Promise<string | undefined> {
        try {
            const rows = await this.runAsync(
                `SELECT rawString FROM trace_data WHERE hash = ?`,
                hash
            );

            if (!rows.length) return undefined;

            return rows[0].rawString;
        } catch (error) {
            console.error('Error finding trace by hash:', error);
            throw error;
        }
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
            if (this.db) {
                this.db.close((e) => (e ? reject(e) : resolve()));
            } else {
                resolve();
            }
        });
    }

    getDbPath(): string {
        return this.dbPath;
    }
}

export class RefluxDBManagement {
    private refluxDbs = new Map<string, RefluxDB>;
    constructor() { }

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
        this.refluxDbs.clear();
    }
}

export const refluxDBManagement = new RefluxDBManagement();