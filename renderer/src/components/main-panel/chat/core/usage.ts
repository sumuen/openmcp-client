import type { IExtraInfo } from "../chat-box/chat";

export interface UsageStatistic {
    input: number;
    output: number;
    total: number;
    cachedInput: number;
    cacheHitRatio: number;
}

export interface TokenConsumptionResult {
    totalInput?: number,
    totalOutput?: number,
    totalHitInput?: number,
    cost?: number,
    pricing?: {
        inputPerMilleHitCache: number,
        inputPerMille: number,
        outputPerMille: number,
        unit: string,
    },
    avgCacheHitRatio: number,
}

export function makeUsageStatistic(extraInfo: IExtraInfo): UsageStatistic | undefined {
    if (extraInfo.serverName === 'unknown' || extraInfo.usage === undefined || extraInfo.usage === null) {
        return undefined;
    }

    const usage = extraInfo.usage;

    switch (extraInfo.serverName) {
        case 'deepseek':
            return {
                input: usage.prompt_tokens,
                cachedInput: usage.prompt_tokens_details?.cached_tokens || 0,
                output: usage.completion_tokens,
                total: usage.prompt_tokens + usage.completion_tokens,
                cacheHitRatio: Math.ceil((usage.prompt_tokens_details?.cached_tokens || 0) / usage.prompt_tokens * 1000) / 10,
            }

        case 'openai':
            return {
                // TODO: 完成其他的数值统计
                input: usage?.prompt_tokens,
                cachedInput: usage.prompt_tokens_details?.cached_tokens || 0,
                output: usage?.completion_tokens,
                total: usage.prompt_tokens + usage.completion_tokens,
                cacheHitRatio: Math.ceil((usage.prompt_tokens_details?.cached_tokens || 0) / usage.prompt_tokens * 1000) / 10,
            }
        

        default:
            if (usage.prompt_tokens && usage.completion_tokens) {
                return {
                    input: usage.prompt_tokens,
                    cachedInput: usage.prompt_tokens_details?.cached_tokens || 0,
                    output: usage.completion_tokens,
                    total: usage.prompt_tokens + usage.completion_tokens,
                    cacheHitRatio: Math.ceil((usage.prompt_tokens_details?.cached_tokens || 0) / usage.prompt_tokens * 1000) / 10,
                }
            }
            return undefined;
    }
}