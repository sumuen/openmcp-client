import * as duckdb from 'duckdb';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

interface RefluxData {
    id: string;
    timestamp: number;
    query: string;
    response: string;
    model: string;
    [key: string]: any;
}

export class RefluxDB {
    private db: duckdb.Database;
    private connection: duckdb.Connection;
    private dbPath: string;

    constructor(tableName: string) {
        const homedir = os.homedir();
        const dbDir = path.join(homedir, '.openmcp', 'duckdb');
        
        // 确保存储目录存在
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.dbPath = path.join(dbDir, `${tableName}.openmcp.duckdb`);
        this.db = new duckdb.Database(this.dbPath);
        this.connection = this.db.connect();
        
        // 创建表
        this.initTable();
    }

    private initTable(): void {
        this.connection.run(`
            CREATE TABLE IF NOT EXISTS reflux_data (
                id VARCHAR PRIMARY KEY,
                timestamp BIGINT,
                query TEXT,
                response TEXT,
                model VARCHAR,
                metadata JSON
            )
        `);
    }

    /**
     * 插入或更新数据
     * @param data 回流数据
     */
    async insert(data: RefluxData): Promise<void> {
        // 创建一个新对象，避免修改原始数据
        const { id, timestamp, query, response, model, ...metadata } = data;

        return new Promise((resolve, reject) => {
            this.connection.run(
                `INSERT OR REPLACE INTO reflux_data (id, timestamp, query, response, model, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    timestamp,
                    query,
                    response,
                    model,
                    JSON.stringify(metadata)
                ],
                (err: duckdb.DuckDbError | null) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * 根据ID查找数据
     * @param id 数据ID
     * @returns 回流数据或undefined
     */
    async findById(id: string): Promise<RefluxData | undefined> {
        return new Promise((resolve, reject) => {
            this.connection.all(`
                SELECT * FROM reflux_data WHERE id = ?
            `, [id], (err: duckdb.DuckDbError | null, result?: any[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (result && result.length > 0) {
                    const row = result[0];
                    const data: RefluxData = {
                        id: row.id,
                        timestamp: row.timestamp,
                        query: row.query,
                        response: row.response,
                        model: row.model,
                        ...JSON.parse(row.metadata || '{}')
                    };
                    resolve(data);
                } else {
                    resolve(undefined);
                }
            });
        });
    }

    /**
     * 查找所有数据
     * @returns 回流数据数组
     */
    async findAll(): Promise<RefluxData[]> {
        return new Promise((resolve, reject) => {
            this.connection.all(`
                SELECT * FROM reflux_data ORDER BY timestamp DESC
            `, (err: duckdb.DuckDbError | null, result?: any[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!result) {
                    resolve([]);
                    return;
                }

                const data = result.map((row: any) => {
                    const item: RefluxData = {
                        id: row.id,
                        timestamp: row.timestamp,
                        query: row.query,
                        response: row.response,
                        model: row.model,
                        ...JSON.parse(row.metadata || '{}')
                    };
                    return item;
                });
                resolve(data);
            });
        });
    }

    /**
     * 根据ID删除数据
     * @param id 数据ID
     */
    async delete(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.run(`
                DELETE FROM reflux_data WHERE id = ?
            `, [id], (err: duckdb.DuckDbError | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 根据模型名称查找数据
     * @param model 模型名称
     * @returns 回流数据数组
     */
    async findByModel(model: string): Promise<RefluxData[]> {
        return new Promise((resolve, reject) => {
            this.connection.all(`
                SELECT * FROM reflux_data WHERE model = ? ORDER BY timestamp DESC
            `, [model], (err: duckdb.DuckDbError | null, result?: any[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!result) {
                    resolve([]);
                    return;
                }

                const data = result.map((row: any) => {
                    const item: RefluxData = {
                        id: row.id,
                        timestamp: row.timestamp,
                        query: row.query,
                        response: row.response,
                        model: row.model,
                        ...JSON.parse(row.metadata || '{}')
                    };
                    return item;
                });
                resolve(data);
            });
        });
    }

    /**
     * 根据时间范围查找数据
     * @param start 开始时间戳
     * @param end 结束时间戳
     * @returns 回流数据数组
     */
    async findByTimeRange(start: number, end: number): Promise<RefluxData[]> {
        return new Promise((resolve, reject) => {
            this.connection.all(`
                SELECT * FROM reflux_data WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC
            `, [start, end], (err: duckdb.DuckDbError | null, result?: any[]) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!result) {
                    resolve([]);
                    return;
                }

                const data = result.map((row: any) => {
                    const item: RefluxData = {
                        id: row.id,
                        timestamp: row.timestamp,
                        query: row.query,
                        response: row.response,
                        model: row.model,
                        ...JSON.parse(row.metadata || '{}')
                    };
                    return item;
                });
                resolve(data);
            });
        });
    }

    /**
     * 关闭数据库连接
     */
    async close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.close((err: duckdb.DuckDbError | null) => {
                if (err) {
                    reject(err);
                } else {
                    this.db.close((err: duckdb.DuckDbError | null) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    }

    /**
     * 获取数据库路径
     * @returns 数据库文件路径
     */
    getDbPath(): string {
        return this.dbPath;
    }
}