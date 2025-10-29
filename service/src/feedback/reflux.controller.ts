import { Controller } from '../common/index.js';
import { RefluxService, RefluxEntry } from './reflux.service.js';
import { RequestData } from '../common/index.dto.js';
import { PostMessageble } from '../hook/adapter.js';

const refluxService = new RefluxService();

export class RefluxController {
    @Controller('feedback/reflux')
    async saveRefluxData(data: RequestData, webview: PostMessageble) {
        const storage = data.storage;

        // TODO: 根据验证器选择是否保存
        
        
        return {
            code: 200,
            msg: ''
        };
    }

    /**
     * 获取所有回流数据
     */
    async getAllRefluxData(): Promise<RefluxEntry[]> {
        return await refluxService.getAll();
    }

    /**
     * 根据ID获取回流数据
     */
    async getRefluxDataById(id: string): Promise<RefluxEntry | undefined> {
        return await refluxService.getById(id);
    }

    /**
     * 根据模型获取回流数据
     */
    async getRefluxDataByModel(model: string): Promise<RefluxEntry[]> {
        return await refluxService.getByModel(model);
    }

    /**
     * 删除回流数据
     */
    async deleteRefluxData(id: string): Promise<void> {
        await refluxService.delete(id);
    }
}