<template>
    <div class="tool-message">
        <div class="message-header">
            <el-tag type="warning">工具</el-tag>
            <span class="tool-name" v-if="message.name">({{ message.name }})</span>
            <span class="message-time">{{ formatTime(message.extraInfo.created) }}</span>
            <el-tag v-if="message.extraInfo.state !== 'none'" :type="getStateTagType(message.extraInfo.state)">
                {{ formatState(message.extraInfo.state) }}
            </el-tag>
        </div>
        <div class="tool-content">
            <div v-for="(content, index) in message.content" :key="index" class="content-item">
                <div class="content-type">
                    类型: {{ content.type }}
                </div>
                <div class="content-text">
                    {{ content.text }}
                </div>
                <div v-if="Object.keys(content).length > 2" class="content-details">
                    <el-collapse>
                        <el-collapse-item title="详细信息">
                            <pre>{{ formatContentDetails(content) }}</pre>
                        </el-collapse-item>
                    </el-collapse>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ToolMessage } from '../../chat/chat-box/chat';


defineProps<{
    message: ToolMessage;
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

const formatContentDetails = (content: Record<string, any>) => {
    const details: Record<string, any> = {};
    Object.keys(content).forEach(key => {
        if (key !== 'type' && key !== 'text') {
            details[key] = content[key];
        }
    });
    return JSON.stringify(details, null, 2);
};
</script>

<style scoped>
.tool-message {
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    padding: 15px;
    background-color: var(--sidebar-item-selected);
}

.message-header {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
}

.tool-name {
    font-weight: bold;
    color: var(--el-text-color-primary);
}

.message-time {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.tool-content {
    margin-top: 10px;
}

.content-item {
    padding: 10px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
    margin-bottom: 10px;
}

.content-item:last-child {
    margin-bottom: 0;
}

.content-type {
    font-weight: bold;
    margin-bottom: 5px;
    color: var(--el-color-warning);
}

.content-text {
    white-space: pre-wrap;
    margin-bottom: 5px;
}

.content-details pre {
    background-color: var(--el-fill-color-dark);
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    margin: 5px 0 0 0;
    font-size: 12px;
}
</style>