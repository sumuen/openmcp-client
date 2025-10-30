<template>
    <div class="performance-detail">
        <el-descriptions title="Token 消耗" :column="1" border>
            <el-descriptions-item label="输入">
                {{ tokenStats.input || 'N/A' }}
            </el-descriptions-item>
            <el-descriptions-item label="输出">
                {{ tokenStats.output || 'N/A' }}
            </el-descriptions-item>
            <el-descriptions-item label="总消耗">
                {{ tokenStats.total || 'N/A' }}
            </el-descriptions-item>
            <el-descriptions-item label="缓存命中率">
                <el-tag v-if="tokenStats.cacheRatio !== undefined" type="warning">
                    {{ (tokenStats.cacheRatio * 100).toFixed(2) }}%
                </el-tag>
                <span v-else>N/A</span>
            </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="metrics-section">
            <h3>性能指标</h3>
            <div class="metrics-grid">
                <el-card class="metric-card" v-for="(value, key) in metrics" :key="key" shadow="hover">
                    <div class="metric-content">
                        <div class="metric-title">{{ getMetricTitle(key) }}</div>
                        <div class="metric-value">{{ formatMetricValue(key, value) }}</div>
                    </div>
                </el-card>
            </div>
        </div>

        <el-divider />

        <div class="future-metrics">
            <h3>未来计划指标</h3>
            <el-alert
                title="以下指标将在未来版本中实现"
                type="info"
                show-icon
                :closable="false"
            />
            <div class="metrics-grid">
                <el-card class="metric-card future" v-for="metric in futureMetrics" :key="metric.key" shadow="hover">
                    <div class="metric-content">
                        <div class="metric-title">{{ metric.title }}</div>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChatStorage } from '../../chat/chat-box/chat';

const props = defineProps<{
    data: ChatStorage;
}>();

// 计算token统计信息
const tokenStats = computed(() => {
    // 从消息中提取最后一个有usage信息的消息
    const messagesWithUsage = props.data.messages.filter(
        msg => msg.extraInfo.usage
    );
    
    if (messagesWithUsage.length > 0) {
        const lastUsage = messagesWithUsage[messagesWithUsage.length - 1].extraInfo.usage;
        if (lastUsage) {
            return {
                total: lastUsage.total_tokens,
                input: lastUsage.prompt_tokens,
                output: lastUsage.completion_tokens,
                cacheRatio: lastUsage.prompt_tokens_details?.cached_tokens && lastUsage.prompt_tokens ?
                    lastUsage.prompt_tokens_details.cached_tokens / lastUsage.prompt_tokens : undefined
            };
        }
    }
    
    return {
        total: 0,
        input: 0,
        output: 0,
        cacheRatio: undefined
    };
});

// 当前可用的指标
const metrics = computed(() => {
    return {
        // 可以从现有数据中计算的指标
        messageCount: props.data.messages.length,
        toolCallCount: props.data.messages.filter(
            msg => msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0
        ).length,
        toolResponseCount: props.data.messages.filter(
            msg => msg.role === 'tool'
        ).length,
        avgMessageLength: props.data.messages.filter(
            msg => msg.role === 'user' || msg.role === 'assistant'
        ).reduce((acc, msg) => acc + msg.content.length, 0) / 
        (props.data.messages.filter(msg => msg.role === 'user' || msg.role === 'assistant').length || 1)
    };
});

// 未来计划的指标
const futureMetrics = [
    {
        key: 'llmSensitivity',
        title: 'LLM Sensitivity',
        description: '不同大模型下的执行结果如何'
    },
    {
        key: 'promptSensitivity',
        title: 'Prompt Sensitivity',
        description: '同义词替换后，系统的调用结果会如何'
    },
    {
        key: 'hallucination',
        title: 'Hallucination',
        description: '告知系统某些信息你不知道后，执行结果中是否会无视上下文对执行器的参数瞎猜'
    },
    {
        key: 'scalability',
        title: 'Scalability',
        description: '随着工具数量的增长，相同任务的执行结果会如何'
    },
    {
        key: 'autonomy',
        title: 'Autonomy',
        description: '大模型对于流程会不会自己去主动调用工具'
    },
    {
        key: 'accuracy',
        title: '准确率',
        description: '系统执行结果的准确性评估'
    }
];

const getMetricTitle = (key: string) => {
    const titles: Record<string, string> = {
        messageCount: '消息总数',
        toolCallCount: '工具调用次数',
        toolResponseCount: '工具响应次数',
        avgMessageLength: '平均消息长度'
    };
    return titles[key] || key;
};

const getMetricDescription = (key: string) => {
    const descriptions: Record<string, string> = {
        messageCount: '对话中消息的总数量',
        toolCallCount: '助手发起的工具调用次数',
        toolResponseCount: '工具返回结果的次数',
        avgMessageLength: '用户和助手消息的平均字符长度'
    };
    return descriptions[key] || '';
};

const formatMetricValue = (key: string, value: number) => {
    if (key === 'avgMessageLength') {
        return value.toFixed(2);
    }
    return value;
};
</script>

<style scoped>
.performance-detail {
    padding: 10px 0;
}

.metrics-section {
    margin-top: 20px;
}

.metrics-section h3,
.future-metrics h3 {
    margin-bottom: 15px;
    color: var(--el-text-color-primary);
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
}

.metric-card {
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
}

.metric-card.future {
    opacity: 0.7;
}

.metric-content {
    padding: 10px 0;
}

.metric-title {
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
}

.metric-value {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--el-color-primary);
}

.metric-description {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.future-metrics {
    margin-top: 30px;
}

:deep(.el-alert) {
    margin-bottom: 20px;
}
</style>