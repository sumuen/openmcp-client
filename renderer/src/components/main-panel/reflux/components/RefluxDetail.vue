<template>
    <div class="reflux-detail">
        <el-scrollbar>
            <div v-if="!selectedItem" class="no-selection">
                <el-empty description="请选择一项以查看详情" />
            </div>
            <div v-else class="detail-content">
                <div class="header">
                    <div class="item-id">ID: {{ selectedItem.id }}</div>
                </div>

                <el-tabs v-model="activeTab" class="detail-tabs">
                    <el-tab-pane label="性能" name="performance">
                        <PerformanceDetail :data="selectedItem.data" />
                    </el-tab-pane>
                    <el-tab-pane label="设置" name="settings">
                        <SettingsDetail :settings="selectedItem.data.settings" />
                    </el-tab-pane>
                    <el-tab-pane label="消息" name="messages">
                        <MessagesList :messages="selectedItem.data.messages" />
                    </el-tab-pane>
                </el-tabs>
            </div>
        </el-scrollbar>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { RefluxItem } from '../types';
import SettingsDetail from './SettingsDetail.vue';
import MessagesList from './MessagesList.vue';
import PerformanceDetail from './PerformanceDetail.vue';

const props = defineProps<{
    selectedItem: RefluxItem | null;
}>();

const activeTab = ref('settings');

const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
};
</script>

<style scoped>
.reflux-detail {
    height: 100%;
}

.no-selection {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.detail-content {
    padding: 20px;
}

.header {
    margin-bottom: 10px;
}

.item-id {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 8px;
}

.item-timestamp {
    color: var(--el-text-color-secondary);
    font-size: 14px;
}
</style>