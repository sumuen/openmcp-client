import duckdb from 'duckdb';
import * as path from 'path';
import * as fs from 'fs';
import { VSCODE_WORKSPACE } from '../hook/setting.js';

/** 将 MCP 服务器名转为安全文件名（不含非法路径字符） */
function escapeServerName(name: string): string {
    return (name || 'default').replace(/[\\/:*?"<>|]/g, '_');
}

/** 与 renderer 侧 BatchValidationStorage 结构一致，按 client 维度持久化到 DuckDB */
export interface BatchValidationStorageRow {
    testCases: Array<{
        id: string;
        name?: string;
        description?: string;
        input: string;
        inputRichContent?: Array<{ type: string; text: string; name?: string; args?: Record<string, string> }>;
        criteria: string[];
    }>;
    selectedCaseIndex: number;
    sourceTabIndex: number;
    evaluationMode: 'pass-fail' | 'score';
}

const DEFAULT_STORAGE: BatchValidationStorageRow = {
    testCases: [],
    selectedCaseIndex: 0,
    sourceTabIndex: 0,
    evaluationMode: 'pass-fail'
};

export class BatchValidationRepository {
    private db: duckdb.Database;
    private dbPath: string;

    constructor(serverName: string) {
        const dbDir = path.join(VSCODE_WORKSPACE || process.cwd(), '.openmcp', 'data');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        const safeName = escapeServerName(serverName);
        this.dbPath = path.join(dbDir, `${safeName}.batch-validation.omdb`);
        this.db = new duckdb.Database(this.dbPath);
        this.initTable();
    }

    private initTable(): void {
        const conn = this.db.connect();
        conn.run(`
            CREATE TABLE IF NOT EXISTS batch_validation_storage (
                k VARCHAR PRIMARY KEY,
                storage_json TEXT,
                updated_at BIGINT
            )
        `);
        conn.close();
    }

    private static readonly ROW_KEY = 'config';

    private runAll(sql: string, ...params: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const conn = this.db.connect();
            conn.all(sql, ...params, (err, rows) => {
                conn.close();
                if (err) return reject(err);
                resolve(rows || []);
            });
        });
    }

    private run(sql: string, ...params: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const conn = this.db.connect();
            conn.run(sql, ...params, (err) => {
                conn.close();
                if (err) return reject(err);
                resolve();
            });
        });
    }

    /** 按服务器维度加载（同一服务器仅一份数据，不依赖会变化的 clientId） */
    async load(): Promise<BatchValidationStorageRow> {
        let rows: any[];
        try {
            rows = await this.runAll(
                'SELECT storage_json FROM batch_validation_storage WHERE k = ?',
                BatchValidationRepository.ROW_KEY
            );
        } catch (err) {
            // 旧表为 client_id 主键，无 k 列，需迁移
            const migrated = await this.migrateFromClientIdTable();
            return migrated;
        }
        if (!rows.length || !rows[0].storage_json) {
            return { ...DEFAULT_STORAGE };
        }
        try {
            const parsed = JSON.parse(rows[0].storage_json) as BatchValidationStorageRow;
            return this.normalizeStorage(parsed);
        } catch {
            return { ...DEFAULT_STORAGE };
        }
    }

    private normalizeStorage(parsed: BatchValidationStorageRow): BatchValidationStorageRow {
        return {
            testCases: Array.isArray(parsed.testCases) ? parsed.testCases : DEFAULT_STORAGE.testCases,
            selectedCaseIndex: typeof parsed.selectedCaseIndex === 'number' ? parsed.selectedCaseIndex : DEFAULT_STORAGE.selectedCaseIndex,
            sourceTabIndex: typeof parsed.sourceTabIndex === 'number' ? parsed.sourceTabIndex : DEFAULT_STORAGE.sourceTabIndex,
            evaluationMode: parsed.evaluationMode === 'score' ? 'score' : 'pass-fail'
        };
    }

    /** 从旧表（client_id 主键）迁移到新表（k 主键） */
    private async migrateFromClientIdTable(): Promise<BatchValidationStorageRow> {
        let rows: any[];
        try {
            rows = await this.runAll(
                'SELECT storage_json FROM batch_validation_storage ORDER BY updated_at DESC LIMIT 1'
            );
        } catch {
            await this.run('DROP TABLE IF EXISTS batch_validation_storage');
            this.initTable();
            return { ...DEFAULT_STORAGE };
        }
        const storage = rows?.length && rows[0].storage_json
            ? this.normalizeStorage(JSON.parse(rows[0].storage_json) as BatchValidationStorageRow)
            : { ...DEFAULT_STORAGE };
        await this.run('DROP TABLE IF EXISTS batch_validation_storage');
        this.initTable();
        await this.save(storage);
        return storage;
    }

    /** 按服务器维度保存（同一服务器仅一份数据） */
    async save(storage: BatchValidationStorageRow): Promise<void> {
        const now = Date.now();
        const json = JSON.stringify(storage);
        await this.run(
            `INSERT INTO batch_validation_storage (k, storage_json, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT (k) DO UPDATE SET
                storage_json = EXCLUDED.storage_json,
                updated_at = EXCLUDED.updated_at`,
            BatchValidationRepository.ROW_KEY,
            json,
            now
        );
    }

    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((e) => (e ? reject(e) : resolve()));
            } else {
                resolve();
            }
        });
    }
}

const repoMap = new Map<string, BatchValidationRepository>();

export function getBatchValidationRepository(serverName: string): BatchValidationRepository {
    const key = escapeServerName(serverName || 'default');
    if (!repoMap.has(key)) {
        repoMap.set(key, new BatchValidationRepository(serverName || 'default'));
    }
    return repoMap.get(key)!;
}
