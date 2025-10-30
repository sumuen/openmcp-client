<template>
    <div class="reflux-container">
        <div class="reflux-list-panel">
            <RefluxList
                :tab-id="props.tabId"
                :items="items"
                :total="count"
                :page-size="pageSize"
                :loading="loading"
                :selected-item="selectedItem"
                @select="handleSelectItem"
                @page-change="handlePageChange"
                @refresh="handleRefreshList"
            />
        </div>
        <div class="reflux-detail-panel">
            <RefluxDetail :selected-item="selectedItem" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRefluxData } from './composables/useRefluxData';
import RefluxList from './components/RefluxList.vue';
import RefluxDetail from './components/RefluxDetail.vue';
import type { RefluxItem, RefluxStorage } from './types';
import { mcpClientAdapter } from '@/views/connect/core';
import { tabs } from '../panel';

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as RefluxStorage;

if (!tabStorage.page) {
    tabStorage.page = 1;
}

// 使用tabId作为name参数获取数据
const {
    items,
    loading,
    count,
    pageSize,
    fetchPage,
    updateCount,
} = useRefluxData();

const selectedItem = ref<RefluxItem | null>(null);

const handleSelectItem = (item: RefluxItem) => {
    selectedItem.value = item;
};

const handleRefreshList = async () => {
    const datasetName = mcpClientAdapter.datasetName;
    await fetchPage(datasetName, tabStorage.page);
    await updateCount(datasetName);
};

const handlePageChange = async (page: number) => {
    const datasetName = mcpClientAdapter.datasetName;
    await fetchPage(datasetName, page);

    tabStorage.page = page;

    // 切换页面时清空选择
    selectedItem.value = null;
};

onMounted(async () => {
    await mcpClientAdapter.lock.wait();
    const datasetName = mcpClientAdapter.datasetName;
    await fetchPage(datasetName, tabStorage.page);
    await updateCount(datasetName);
});
</script>

<style scoped>
.reflux-container {
    display: flex;
    height: 100%;
    background-color: var(--el-bg-color-page);
}

.reflux-list-panel {
    width: 300px;
    border-right: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color);
}

.reflux-detail-panel {
    flex: 1;
    background-color: var(--el-bg-color);
}
</style>