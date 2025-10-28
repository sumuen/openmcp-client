import { RefluxDB } from '../hook/duckdb.js';

export interface RefluxEntry {
    id: string;
    timestamp: number;
    query: string;
    response: string;
    model: string;
    [key: string]: any;
}

export class RefluxService {
    private db: RefluxDB;

    constructor() {
        this.db = new RefluxDB('reflux');
    }

    /**
     * 保存回流数据
     * @param entry 回流数据条目
     */
    async save(entry: RefluxEntry): Promise<void> {
        await this.db.insert(entry);
    }

    /**
     * 根据ID获取回流数据
     * @param id 数据ID
     * @returns 回流数据条目
     */
    async getById(id: string): Promise<RefluxEntry | undefined> {
        return await this.db.findById(id);
    }

    /**
     * 获取所有回流数据
     * @returns 回流数据列表
     */
    async getAll(): Promise<RefluxEntry[]> {
        return await this.db.findAll();
    }

    /**
     * 删除指定ID的回流数据
     * @param id 数据ID
     */
    async delete(id: string): Promise<void> {
        await this.db.delete(id);
    }

    /**
     * 根据模型名称获取回流数据
     * @param model 模型名称
     * @returns 回流数据列表
     */
    async getByModel(model: string): Promise<RefluxEntry[]> {
        return await this.db.findByModel(model);
    }

    /**
     * 根据时间范围获取回流数据
     * @param start 开始时间戳
     * @param end 结束时间戳
     * @returns 回流数据列表
     */
    async getByTimeRange(start: number, end: number): Promise<RefluxEntry[]> {
        return await this.db.findByTimeRange(start, end);
    }

    /**
     * 关闭数据库连接
     */
    async close(): Promise<void> {
        await this.db.close();
    }
}