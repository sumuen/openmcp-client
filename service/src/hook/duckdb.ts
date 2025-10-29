import duckdb from 'duckdb';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export interface StorageRecord {
    id: string;
    type: string;
    source?: string;
    timestamp: number;
    content?: string;
    metadata?: Record<string, any>;
    tags?: string[];
}

export class RefluxDB {
    private db: duckdb.Database;
    private connection: duckdb.Connection;
    private dbPath: string;

    constructor(tableName: string = 'storage') {
        const homedir = os.homedir();
        const dbDir = path.join(homedir, '.openmcp', 'duckdb');
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

        this.dbPath = path.join(dbDir, `${tableName}.duckdb`);
        this.db = new duckdb.Database(this.dbPath);
        this.connection = this.db.connect();

        this.initTable();
    }

    private initTable() {
        this.connection.run(`
            CREATE TABLE IF NOT EXISTS storage_data (
                id VARCHAR PRIMARY KEY,
                type VARCHAR,
                source VARCHAR,
                timestamp BIGINT,
                content TEXT,
                metadata JSON,
                tags JSON
            )
        `);
    }

    async insert(record: StorageRecord): Promise<void> {
        const { id, type, source, timestamp, content, metadata = {}, tags = [] } = record;
        return new Promise((resolve, reject) => {
            this.connection.run(
                `INSERT OR REPLACE INTO storage_data 
                (id, type, source, timestamp, content, metadata, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    type,
                    source ?? null,
                    timestamp,
                    content ?? '',
                    JSON.stringify(metadata),
                    JSON.stringify(tags)
                ],
                (err: duckdb.DuckDbError | null) => (err ? reject(err) : resolve())
            );
        });
    }

    async findById(id: string): Promise<StorageRecord | undefined> {
        return new Promise((resolve, reject) => {
            this.connection.all(
                `SELECT * FROM storage_data WHERE id = ?`,
                [id],
                (err, rows) => {
                    if (err) return reject(err);
                    if (!rows || !rows.length) return resolve(undefined);
                    const row = rows[0];
                    resolve(this.deserialize(row));
                }
            );
        });
    }

    async findByType(type: string): Promise<StorageRecord[]> {
        return this.query(`SELECT * FROM storage_data WHERE type = ? ORDER BY timestamp DESC`, [type]);
    }

    async findByTag(tag: string): Promise<StorageRecord[]> {
        return this.query(`
            SELECT * FROM storage_data
            WHERE json_contains(tags, '"${tag}"')
            ORDER BY timestamp DESC
        `);
    }

    async search(keyword: string): Promise<StorageRecord[]> {
        return this.query(
            `SELECT * FROM storage_data 
             WHERE content LIKE ? 
             ORDER BY timestamp DESC`,
            [`%${keyword}%`]
        );
    }

    async findRecent(limit = 20): Promise<StorageRecord[]> {
        return this.query(
            `SELECT * FROM storage_data ORDER BY timestamp DESC LIMIT ?`,
            [limit]
        );
    }

    async findByTimeRange(start: number, end: number): Promise<StorageRecord[]> {
        return this.query(
            `SELECT * FROM storage_data WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC`,
            [start, end]
        );
    }

    async delete(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.run(
                `DELETE FROM storage_data WHERE id = ?`,
                [id],
                (err) => (err ? reject(err) : resolve())
            );
        });
    }

    private async query(sql: string, params: any[] = []): Promise<StorageRecord[]> {
        return new Promise((resolve, reject) => {
            this.connection.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve((rows ?? []).map(this.deserialize));
            });
        });
    }

    private deserialize(row: any): StorageRecord {
        return {
            id: row.id,
            type: row.type,
            source: row.source,
            timestamp: row.timestamp,
            content: row.content,
            metadata: JSON.parse(row.metadata || '{}'),
            tags: JSON.parse(row.tags || '[]'),
        };
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
