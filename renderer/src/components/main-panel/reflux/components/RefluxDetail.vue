<template>
    <div class="reflux-detail">
        <div v-if="!selectedItem" class="no-selection">
            <el-empty description="请选择一项以查看详情" />
        </div>
        <div v-else class="detail-content">
            <!-- 详细信息展示区域，暂时留空 -->
            <div class="header">
                <div class="item-id">ID: {{ selectedItem.id }}</div>
            </div>
            <!-- 后续会在这里实现详细的信息展示 -->
        </div>
    </div>
</template>

<script setup lang="ts">
import type { RefluxItem } from '../types';

defineProps<{
    selectedItem: RefluxItem | null;
}>();
</script>

<style scoped>
.reflux-detail {
    height: 100%;
    overflow-y: auto;
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
    margin-bottom: 20px;
}

.item-id {
    color: var(--el-text-color-secondary);
    font-size: 14px;
    margin-top: 8px;
}
</style>