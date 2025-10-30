<template>
    <div class="user-message">
        <div class="message-header">
            <el-tag type="info">用户</el-tag>
            <span class="message-time">{{ formatTime(message.extraInfo.created) }}</span>
        </div>
        <div class="message-content">
            {{ message.content }}
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
</script>

<style scoped>

.user-message {
    border: 1px solid var(--el-border-color);
    border-radius: 8px;
    padding: 15px;
    background-color: var(--sidebar-item-selected);
}

.message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.message-time {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.message-content {
    white-space: pre-wrap;
    line-height: 1.5;
}
</style>