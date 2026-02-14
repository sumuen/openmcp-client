<template>
    <div class="tool-module-container">
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
        <div class="tool-detail-panel">
            <el-scrollbar>
                <div class="detail-content">
                    <keep-alive>
                        <component :is="currentView" :tab-id="props.tabId" />
                    </keep-alive>
                </div>
            </el-scrollbar>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import ToolDebug from './tool-debug/index.vue';
import Flow from './flow/index.vue';
import VariableManagement from './variable-management/index.vue';
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
    { label: t('variable-management'), value: 'variable-management' },
    { label: t('test-flow'), value: 'flow' },
]);

const currentView = computed(() => {
    if (activeView.value === 'variable-management') {
        return VariableManagement;
    } else if (activeView.value === 'flow') {
        return Flow;
    } else {
        return ToolDebug;
    }

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
/* 与批量测试一致的左右分栏布局 */
.tool-module-container {
    display: flex;
    height: 100%;
}

.tool-list-panel {
    width: 200px;
    border-right: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
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
    background-color: var(--el-bg-color);
}

.tool-detail-panel .el-scrollbar {
    height: 100%;
}

.tool-detail-panel .detail-content {
    padding: 20px;
    min-height: 100%;
}
</style>