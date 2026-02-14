<template>
    <div class="tool-module-container">
        <el-splitter class="tool-splitter">
            <el-splitter-panel :min="120" :max="400" size="200" class="splitter-panel-left">
                <div class="tool-list-panel">
                    <div class="list-container">
                        <el-scrollbar>
                            <div class="list-inner">
                                <div
                                    v-for="opt in menuOptions"
                                    :key="opt.value"
                                    class="list-item"
                                    :class="{ active: activeView === opt.value }"
                                    @click="activeView = opt.value"
                                >
                                    <div class="list-item-content">
                                        <div class="item-title">{{ opt.label }}</div>
                                    </div>
                                </div>
                            </div>
                        </el-scrollbar>
                    </div>
                </div>
            </el-splitter-panel>
            <el-splitter-panel class="splitter-panel-right">
                <div class="tool-detail-panel">
                    <el-scrollbar>
                        <div class="detail-content">
                                <keep-alive>
                                    <component :is="currentView" :tab-id="props.tabId" />
                                </keep-alive>
                        </div>
                    </el-scrollbar>
                </div>
            </el-splitter-panel>
        </el-splitter>
    </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import ToolDebug from './tool-debug/index.vue';
import Flow from './flow/index.vue';
import VariableManagement from './variable-management/index.vue';
import TestCases from './tool-debug/test-cases/index.vue';
const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});


const activeView = ref('cases');

const menuOptions = computed(() => [
    { label: t('tool-debug'), value: 'cases' },
    { label: t('test-cases'), value: 'test-cases' },
    { label: t('variable-management'), value: 'variable-management' },
    { label: t('test-flow'), value: 'flow' },
]);

const currentView = computed(() => {
    if (activeView.value === 'test-cases') {
        return TestCases;
    }
    if (activeView.value === 'variable-management') {
        return VariableManagement;
    }
    if (activeView.value === 'flow') {
        return Flow;
    }
    return ToolDebug;
});

// Allow external triggers to open the "variable-management" tab via a custom event
const handleOpenVariableManagement = () => {
    activeView.value = 'variable-management';
};

onMounted(() => {
    window.addEventListener('open-variable-management', handleOpenVariableManagement);
});

onBeforeUnmount(() => {
    window.removeEventListener('open-variable-management', handleOpenVariableManagement);
});
</script>

<style scoped>
/* 与批量测试一致的左右分栏布局，使用 Splitter 支持拖拽调整宽度 */
.tool-module-container {
    height: 100%;
}

.tool-splitter {
    height: 100%;
}

.tool-splitter :deep(.el-splitter__panel) {
    overflow: hidden;
}

.splitter-panel-left {
    display: flex;
    flex-direction: column;
}

.splitter-panel-right {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.tool-list-panel {
    width: 100%;
    height: 100%;
    border-right: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.tool-list-panel .list-container {
    flex: 1;
    min-height: 0;
}

.tool-list-panel .list-container .el-scrollbar {
    height: 100%;
}

.tool-list-panel .list-inner {
    padding: 10px;
}

.tool-list-panel .list-item {
    margin: 3px;
    padding: 10px 12px;
    border-radius: 0.3em;
    user-select: none;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    transition: var(--animation-3s);
}

.tool-list-panel .list-item-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.tool-list-panel .list-item:hover {
    background-color: var(--el-fill-color-light);
}

.tool-list-panel .list-item.active {
    background-color: var(--el-fill-color-light);
    border-left: 3px solid var(--el-color-primary-light-5);
}

.tool-list-panel .item-title {
    font-weight: bold;
    font-size: 13px;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tool-detail-panel {
    flex: 1;
    min-width: 0;
    width: 100%;
    height: 100%;
    background-color: var(--el-bg-color);
    overflow: hidden;
}

.tool-detail-panel .el-scrollbar {
    height: 100%;
}

/* 确保滚动区域内的 view 占满高度，使内部 run-debug 的 splitter 能正确计算百分比 */
.tool-detail-panel :deep(.el-scrollbar__wrap),
.tool-detail-panel :deep(.el-scrollbar__view) {
    height: 100%;
}

.tool-detail-panel .detail-content {
    min-height: 100%;
    height: 100%;
    box-sizing: border-box;
}
</style>