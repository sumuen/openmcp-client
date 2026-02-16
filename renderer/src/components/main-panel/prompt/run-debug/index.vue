<template>
    <div class="run-debug-container">
        <el-splitter layout="vertical" class="run-debug-splitter">
            <el-splitter-panel :min="180" :max="600" :size="320" class="run-debug-executor-panel">
                <div class="run-debug-executor-wrap">
                    <div class="run-debug-panel-inner">
                        <el-scrollbar height="100%">
                            <PromptReader ref="executorRef" :tab-id="props.tabId" />
                        </el-scrollbar>
                    </div>
                </div>
            </el-splitter-panel>
            <el-splitter-panel class="run-debug-logger-panel">
                <div class="run-debug-logger-wrap">
                    <div class="run-debug-panel-inner">
                        <PromptLogger :tab-id="props.tabId">
                            <template #actions>
                                <PromptExecutorActions />
                            </template>
                        </PromptLogger>
                    </div>
                </div>
            </el-splitter-panel>
        </el-splitter>
    </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import PromptReader from '../prompt-reader.vue';
import PromptLogger from '../prompt-logger.vue';
import PromptExecutorActions from './prompt-executor-actions.vue';

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const executorRef = ref<InstanceType<typeof PromptReader> | null>(null);
provide('promptExecutorRef', executorRef);
provide('promptExecutorReset', () => executorRef.value?.resetForm?.());
</script>

<style scoped>
.run-debug-container {
    height: 100%;
    min-height: 0;
}

.run-debug-splitter {
    height: 100%;
    width: 100%;
}

.run-debug-splitter :deep(.el-splitter__panel) {
    overflow: hidden;
}

.run-debug-executor-panel {
    display: flex;
    flex-direction: column;
}

.run-debug-executor-wrap {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.run-debug-panel-inner {
    width: 100%;
    max-width: 880px;
    margin: 0 auto;
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.run-debug-executor-wrap .run-debug-panel-inner :deep(.el-scrollbar__wrap),
.run-debug-executor-wrap .run-debug-panel-inner :deep(.el-scrollbar__view) {
    height: 100%;
}

.run-debug-logger-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.run-debug-logger-wrap {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
</style>
