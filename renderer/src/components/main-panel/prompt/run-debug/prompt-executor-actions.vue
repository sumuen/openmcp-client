<template>
    <div v-if="executor" class="executor-actions-wrapper">
        <el-button-group class="executor-actions-group">
            <el-button class="btn-secondary btn-reset" @click="onReset">
                {{ executor.t('reset') }}
            </el-button>
            <el-dropdown
                trigger="hover"
                class="load-test-data-dropdown"
                :disabled="!executor.currentPrompt || !executor.savedDataList || executor.savedDataList.length === 0"
                @command="(name: string) => executor.handleLoadSaved(name)"
            >
                <span
                    class="el-dropdown-link load-test-data-dropdown-link"
                    :class="{ 'is-disabled': !executor.currentPrompt || !executor.savedDataList || executor.savedDataList.length === 0 }"
                >
                    {{ executor.t('load-test-data') }}
                    <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </span>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item
                            v-for="item in (executor.savedDataList || [])"
                            :key="item.name"
                            :command="item.name"
                        >
                            {{ item.name }}
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
            <el-button
                class="btn-secondary"
                :disabled="!executor.currentPrompt"
                @click="executor.openSaveDialog"
            >
                {{ executor.t('save-test-data') }}
            </el-button>
            <el-button
                type="primary"
                :loading="executor.loading"
                :disabled="!executor.currentPrompt"
                @click="executor.handleSubmit"
                class="btn-execute"
            >
                <span>{{ executor.t('read-prompt') }}</span>
                <span class="ctrl">CTRL</span>
                <span class="iconfont icon-enter"></span>
            </el-button>
        </el-button-group>
    </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';

const executorRef = inject<{ value?: any }>('promptExecutorRef', { value: null });
const executor = computed(() => executorRef?.value ?? null);
const executorReset = inject<() => void>('promptExecutorReset', () => {});

function onReset() {
    executorReset();
}
</script>

<style scoped>
/* 与设置页 API 的 setting-save-container 一致：右对齐 + 按钮组 */
.executor-actions-wrapper {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    margin: 16px 0;
}

.executor-actions-group {
    display: inline-flex;
}


.executor-actions-group .el-button:first-child {
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
}

.executor-actions-group .el-button:last-child {
    border: 1px solid var(--main-light-color-50) !important;
    border-bottom-right-radius: 8px !important;
    border-top-right-radius: 8px !important;
}

.executor-actions-group .el-button {
    border-radius: 0 !important;
    border-color: var(--window-button-active) !important;
    border-top: 1px solid var(--window-button-active);
    border-bottom: 1px solid var(--window-button-active);
    border-left: 1px solid var(--window-button-active);
    border-right: 1px solid var(--window-button-active);
    background-color: var(--el-fill-color-blank);
    color: var(--el-text-color-regular);
    padding: 8px 18px;
    font-size: 14px;
    transition: var(--animation-3s);
}

.executor-actions-group .btn-secondary {
    border-radius: 0;
}

.executor-actions-group .el-button:hover:not(:disabled):not(.btn-execute) {
    border-color: var(--el-border-color-hover);
    background-color: var(--main-light-color-50);
    color: var(--el-text-color-primary);
}

.executor-actions-group .btn-secondary.is-disabled {
    opacity: 0.5;
}

.btn-reset {
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
}

.load-test-data-dropdown {
    display: inline-flex;
}

.load-test-data-dropdown-link {
    cursor: pointer;
    color: var(--el-text-color-regular);
    display: flex;
    align-items: center;
    padding: 8px 18px;
    font-size: 14px;
    border-top: 1px solid var(--window-button-active);
    border-bottom: 1px solid var(--window-button-active);
    border-left: 1px solid var(--window-button-active);
    background-color: var(--el-fill-color-blank);
    transition: var(--animation-3s);
}

.load-test-data-dropdown-link:hover:not(.is-disabled) {
    color: var(--el-text-color-primary);
    background-color: var(--main-light-color-50);
}

.load-test-data-dropdown-link.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.load-test-data-dropdown-link .el-icon--right {
    margin-left: 4px;
}

.executor-actions-group > *:last-child .el-button {
    border-top-right-radius: 8px !important;
    border-bottom-right-radius: 8px !important;
    border: 1px solid var(--main-light-color-70) !important;
}

.executor-actions-group .el-button:only-child {
    border-radius: 8px !important;
}

/* 执行按钮与设置页「保存」按钮一致：强调色 */
.btn-execute {
    background-color: var(--main-light-color-20) !important;
    color: var(--el-text-color-primary) !important;
    border-color: var(--main-light-color-50) !important;
    font-weight: 600;
}

.btn-execute:hover:not(:disabled),
.btn-execute:focus {
    background-color: var(--main-light-color-50) !important;
    color: var(--el-text-color-primary) !important;
    border-color: var(--main-light-color-90) !important;
}

.run-shortcut-hint {
    margin-left: 10px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    opacity: 0.75;
}

/* 与设置页测试/保存按钮一致的快捷键提示 */
.btn-execute .ctrl {
    margin-left: 5px;
    opacity: 0.6;
    font-weight: 100;
}

.btn-execute .iconfont {
    color: var(--main-color);
}

</style>
