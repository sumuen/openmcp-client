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
                <el-button
                    class="btn-secondary"
                    :disabled="!executor.currentPrompt || !executor.savedDataList || executor.savedDataList.length === 0"
                >
                    {{ executor.t('load-test-data') }}
                    <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
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
.executor-actions-wrapper {
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

.executor-actions-group {
    display: inline-flex;
}

.executor-actions-group .btn-secondary {
    border-radius: 0;
    border-color: var(--el-border-color);
    background-color: var(--el-fill-color-blank);
    color: var(--el-text-color-regular);
}

.executor-actions-group .btn-secondary:hover:not(:disabled) {
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

.load-test-data-dropdown .el-button {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}
.load-test-data-dropdown .el-icon--right {
    margin-left: 4px;
}

.executor-actions-group > *:last-child .el-button {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
}

.btn-execute {
    border-radius: 8px;
    padding-left: 20px;
    padding-right: 20px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.run-shortcut-hint {
    margin-left: 10px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    opacity: 0.75;
}

.btn-execute .ctrl {
    margin-left: 5px;
    opacity: 0.6;
    font-weight: 100;
}

.btn-execute .iconfont {
    color: var(--main-light-color-70);
}

</style>
