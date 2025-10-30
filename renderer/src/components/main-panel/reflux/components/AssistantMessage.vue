<template>
    <div class="assistant-message">
        <div class="message-header">
            <el-tag type="success">助手</el-tag>
            <span class="message-time">{{ formatTime(message.extraInfo.created) }}</span>
            <el-tag v-if="message.extraInfo.state !== 'none'" :type="getStateTagType(message.extraInfo.state)">
                {{ formatState(message.extraInfo.state) }}
            </el-tag>
        </div>
        <div class="message-content">
            {{ message.content }}
        </div>
        <div v-if="message.tool_calls && message.tool_calls.length > 0" class="tool-calls">
            <h4>工具调用:</h4>
            <el-table :data="message.tool_calls" style="width: 100%" size="small">
                <el-table-column prop="function.name" label="工具名称" />
                <el-table-column label="参数">
                    <template #default="scope">
                        <pre>{{ formatArguments(scope.row.function.arguments) }}</pre>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { TextMessage } from '../../chat/chat-box/chat';


defineProps<{
    message: TextMessage;
}>();

const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
};

const formatState = (state: string) => {
    const stateMap: Record<string, string> = {
        'success': '成功',
        'server internal error': '服务器错误',
        'receive chunk error': '接收数据错误',
        'timeout': '超时',
        'max epochs': '达到最大轮数',
        'unknown error': '未知错误',
        'abort': '中止',
        'tool call failed': '工具调用失败',
        'parse json error': 'JSON解析错误',
        'no tool function': '无工具函数',
        'invalid xml': '无效XML',
        'none': '无'
    };
    return stateMap[state] || state;
};

const getStateTagType = (state: string) => {
    if (state === 'success' || state === 'none') return 'success';
    if (state === 'timeout' || state === 'max epochs') return 'warning';
    return 'danger';
};

const formatArguments = (args: string) => {
    try {
        const parsed = JSON.parse(args);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return args;
    }
};
</script>

<style scoped>
.assistant-message {
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    padding: 15px;
    width: 100%;
    background-color: var(--sidebar-item-selected);
}

.message-header {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
}

.message-time {
    color: var(--sidebar-item-selected);
    font-size: 12px;
}

.message-content {
    white-space: pre-wrap;
    line-height: 1.5;
    margin-bottom: 10px;
}

.tool-calls h4 {
    margin: 10px 0 5px 0;
    color: var(--el-text-color-primary);
}

.tool-calls pre {
    background-color: var(--el-fill-color-light);
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0;
    font-size: 12px;
}
</style>