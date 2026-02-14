<template>
    <div v-if="executor" class="executor-actions-wrapper">
        <el-button-group class="executor-actions-group">
            <el-button class="btn-secondary btn-reset" @click="executor.resetForm">
                {{ executor.t('reset') }}
            </el-button>
            <el-button class="btn-secondary" @click="executor.variableExtractionVisible = true">
                {{ executor.t('variable-extraction') }}
            </el-button>
            <el-dropdown trigger="hover" class="mock-dropdown" @command="executor.onMockCommand">
                <span
                    class="el-dropdown-link mock-dropdown-link"
                    :class="{ 'is-disabled': executor.loading || executor.mockLoading || executor.aiMockLoading }"
                >
                    Mock
                    <el-icon class="el-icon--right">
                        <ArrowDown />
                    </el-icon>
                </span>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="schema">Mock (Schema)</el-dropdown-item>
                        <el-dropdown-item command="ai">AI Mock</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
            <el-button
                v-if="executor.currentTool"
                class="btn-secondary"
                :disabled="executor.loading"
                @click="executor.saveAsTestCase"
            >
                {{ executor.t('save-as-test-case') }}
            </el-button>
            <el-button
                type="primary"
                :loading="executor.loading"
                @click="executor.handleExecute"
                class="btn-execute"
            >
                {{ executor.t('execute-tool') }}
            </el-button>
        </el-button-group>
    </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';

const executorRef = inject<{ value?: any }>('toolExecutorRef', { value: null });
const executor = computed(() => executorRef?.value ?? null);
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

.executor-actions-group > *:last-child .el-button {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
}

.mock-dropdown {
    display: inline-flex;
}

.mock-dropdown-link {
    cursor: pointer;
    color: var(--el-text-color-regular);
    display: flex;
    align-items: center;
    padding: 8px 15px;
    font-size: 14px;
    border: 1px solid var(--el-border-color);
    border-left: none;
    background-color: var(--el-fill-color-blank);
}

.mock-dropdown-link:hover:not(.is-disabled) {
    color: var(--el-text-color-primary);
    background-color: var(--main-light-color-50);
}

.mock-dropdown-link.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.mock-dropdown-link .el-icon--right {
    margin-left: 4px;
}

.btn-execute {
    border-radius: 8px;
    padding-left: 20px;
    padding-right: 20px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
