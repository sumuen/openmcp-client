<template>
    <div class="reflux-list">
        <div class="list-header">
            <el-button type="primary" @click="refreshList" :loading="loading">
                <span class="iconfont icon-refresh"></span>
            </el-button>
        </div>
        <div class="list-container">
            <el-scrollbar>
                <div v-for="item in items" :key="item.id" class="list-item"
                    :class="{ active: selectedItem?.id === item.id }" @click="selectItem(item)">
                    <div class="item-title">
                        {{ getItemTitle(item) }}
                    </div>
                    <div class="item-timestamp">
                        {{ formatTimestamp(item.timestamp) }}
                    </div>
                </div>
            </el-scrollbar>
        </div>

        <div class="pagination" v-if="props.total > props.pageSize">
            <el-pagination
                layout="prev, pager, next"
                :total="total"
                :page-size="pageSize"
                :current-page="tabStorage.page"
                @current-change="handlePageChange"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RefluxItem, RefluxStorage } from '../types';
import { tabs } from '../../panel';

const props = defineProps<{
    tabId: number;
    items: RefluxItem[];
    total: number;
    pageSize: number;
    loading: boolean;
    selectedItem: RefluxItem | null;
}>();

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as RefluxStorage;

if (!tabStorage.page) {
    tabStorage.page = 1;
}


const emit = defineEmits<{
    (e: 'select', item: RefluxItem): void;
    (e: 'pageChange', page: number): void;
    (e: 'refresh'): void;
}>();

const selectItem = (item: RefluxItem) => {
    emit('select', item);
};

const handlePageChange = (page: number) => {
    emit('pageChange', page);
};

const refreshList = () => {
    emit('refresh');
};

const getItemTitle = (item: RefluxItem) => {
    // 尝试从聊天数据中提取标题
    if (item.data && Array.isArray(item.data.messages) && item.data.messages.length > 0) {
        const firstMessage = item.data.messages[0];
        if (firstMessage.role === 'user' && typeof firstMessage.content === 'string') {
            return firstMessage.content.substring(0, 50) + (firstMessage.content.length > 50 ? '...' : '');
        }
        return 'Chat Session';
    }
    return 'Untitled';
};

const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
};
</script>

<style scoped>
.reflux-list {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.list-header {
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-light);
}

.list-header .iconfont {
    font-size: 20px;
}

.list-container {
    flex: 1;
    overflow-y: auto;
}

.list-item {
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-light);
    cursor: pointer;
    transition: background-color 0.2s;
}

.list-item:hover {
    background-color: var(--el-fill-color-light);
}

.list-item.active {
    background-color: var(--el-color-primary-light-9);
    border-left: 3px solid var(--el-color-primary);
}

.item-title {
    font-weight: 500;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-timestamp {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.pagination {
    padding: 16px 0;
    display: flex;
    justify-content: center;
}
</style>