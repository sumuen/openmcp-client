<template>
    <div class="messages-list">
        <div v-if="messages && messages.length > 0">
            <div v-for="(message, index) in messages" :key="index" class="message-item">
                <UserMessage v-if="message.role === 'user'" :message="message" />
                <AssistantMessage v-else-if="message.role === 'assistant'" :message="message" />
                <ToolMessage v-else-if="message.role === 'tool'" :message="message" />
                <div v-else class="unknown-message">
                    未知消息类型: {{ message.role }}
                </div>
            </div>
        </div>
        <div v-else>
            <el-empty description="没有消息" />
        </div>
    </div>
</template>

<script setup lang="ts">
import UserMessage from './UserMessage.vue';
import AssistantMessage from './AssistantMessage.vue';
import ToolMessage from './ToolMessage.vue';
import type { ChatMessage } from '../../chat/chat-box/chat';

defineProps<{
    messages: ChatMessage[];
}>();
</script>

<style scoped>
.messages-list {
    padding: 10px 0;
}

.message-item {
    margin-bottom: 20px;
}

.message-item:last-child {
    margin-bottom: 0;
}

.unknown-message {
    padding: 10px;
    background-color: var(--el-color-warning-light-9);
    border: 1px solid var(--el-color-warning-light-5);
    border-radius: 4px;
    color: var(--el-color-warning);
}
</style>