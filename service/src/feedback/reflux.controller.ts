import { RefluxService, RefluxEntry } from './reflux.service.js';

const refluxService = new RefluxService();

export class RefluxController {
    /**
     * 保存回流数据示例
     */
    static async saveRefluxData(data: any): Promise<{ id: string }> {
        const id = Date.now().toString(); // 简单的ID生成策略
        const entry: RefluxEntry = {
            id,
            timestamp: Date.now(),
            ...data
        };

        await refluxService.save(entry);
        return { id };
    }

    /**
     * 获取所有回流数据
     */
    static async getAllRefluxData(): Promise<RefluxEntry[]> {
        return await refluxService.getAll();
    }

    /**
     * 根据ID获取回流数据
     */
    static async getRefluxDataById(id: string): Promise<RefluxEntry | undefined> {
        return await refluxService.getById(id);
    }

    /**
     * 根据模型获取回流数据
     */
    static async getRefluxDataByModel(model: string): Promise<RefluxEntry[]> {
        return await refluxService.getByModel(model);
    }

    /**
     * 删除回流数据
     */
    static async deleteRefluxData(id: string): Promise<void> {
        await refluxService.delete(id);
    }
}