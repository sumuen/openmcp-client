<template>
    <div class="tool-trace-container">

        <div class="content">
            <el-empty v-if="!hasToolCalls" :description="t('no-tool-calls')"></el-empty>
            <div v-else class="tool-trace-list">
                <!-- 工具调用可视化内容将在这里展示 -->
                <div class="placeholder">
                    {{ t('tool-call-visualization-will-be-displayed-here') }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed, defineProps } from 'vue';
import { tabs } from '../panel';
import type { ChatStorage } from './chat-box/chat';

const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as ChatStorage;

// 检查是否存在工具调用
const hasToolCalls = computed(() => {
    if (!tabStorage.messages) return false;
    
    return tabStorage.messages.some(message => 
        message.role === 'assistant' && message.tool_calls && message.tool_calls.length > 0
    );
});
</script>

<style scoped>
.tool-trace-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color);
}

.header h3 {
    margin: 0;
    color: var(--el-text-color-primary);
}

.content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.tool-trace-list {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.placeholder {
    text-align: center;
    color: var(--el-text-color-secondary);
    padding: 20px;
    font-style: italic;
}
</style>