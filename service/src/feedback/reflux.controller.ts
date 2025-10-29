import { Controller } from '../common/index.js';
import { RefluxService } from './reflux.service.js';
import { RequestData } from '../common/index.dto.js';
import { PostMessageble } from '../hook/adapter.js';

const refluxService = new RefluxService();

export class RefluxController {
    @Controller('feedback/reflux')
    async saveRefluxData(data: RequestData, webview: PostMessageble) {
        const storage = data.storage;
        const name = data.name;

        // TODO: 根据验证器选择是否保存
        await refluxService.save(name, storage);
        
        return {
            code: 200,
            msg: ''
        };
    }
}