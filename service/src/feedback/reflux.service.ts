import { ChatStorage, TokenConsumption } from './reflux.dto.js';
import { RefluxDB, RefluxDBManagement } from './reflux.repository.js';

export class RefluxService {

    constructor(
        private db: RefluxDBManagement = new RefluxDBManagement(),
    ) {
    }

    /**
     * 保存回流数据
     * @param entry 回流数据条目
     */
    async save(name: string, storage: ChatStorage): Promise<void> {
        const refluxDb = this.db.get(name);        
        // 生成trace和tokenConsumption数据        
        const trace = this.makeTrace(storage);
        const tokenConsumption = this.makeTokenConsumption(storage);

        await refluxDb.insert(
            storage.id,
            storage,
            trace,
            tokenConsumption
        );
    }

    /**
     * 关闭数据库连接
     */
    async close(): Promise<void> {
        await this.db.close();
    }

    public makeTrace(storage: ChatStorage): string {
        const trace: string[] = [];
        
        for (let i = 0; i < storage.messages.length; i++) {
            const message = storage.messages[i];
            
            // 根据trace-table.vue中的处理逻辑，我们需要处理不同类型的message
            if (message.role === 'assistant') {
                // 处理assistant消息                  
                if (message.tool_calls) {
                    const toolNames = message.tool_calls.map(toolCall => toolCall.function?.name || '');
                    trace.push(toolNames.join(','));
                } else {
                    trace.push(`assistant`);
                }
                
            } else if (message.role === 'user') {
                // 处理user消息
                trace.push(`user`);
            } else if (message.role === 'tool') {
                // 处理tool消息
                // 根据类型定义，message.content是ToolCallContent[]数组

            }
        }

        return trace.join('|');
    }

    public makeTokenConsumption(storage: ChatStorage): TokenConsumption {
        let total = 0;
        let input = 0;
        let output = 0;
        let cacheTokens = 0;
        let totalCacheTokens = 0;
        
        // 遍历所有消息，收集token使用情况
        for (let i = 0; i < storage.messages.length; i++) {
            const message = storage.messages[i];
            const usage = message.extraInfo.usage;
            
            if (usage) {
                input += usage.prompt_tokens || 0;
                output += usage.completion_tokens || 0;
                total += usage.total_tokens || 0;
                
                // 收集缓存信息
                if (usage.prompt_tokens_details?.cached_tokens) {
                    cacheTokens += usage.prompt_tokens_details.cached_tokens;
                }
            }
        }
        
        // 计算缓存命中率
        const cacheRatio = input > 0 ? cacheTokens / input : 0;
        
        return {
            total,
            input,
            output,
            cacheRatio
        };
    }
}