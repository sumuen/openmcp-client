<template>
    <div class="run-debug-container">
        <el-splitter layout="vertical" class="run-debug-splitter">
            <el-splitter-panel :min="180" :max="600" :size="320" class="run-debug-executor-panel">
                <div class="run-debug-executor-wrap">
                    <div class="run-debug-panel-inner">
                        <el-scrollbar height="100%">
                            <ToolExecutor ref="executorRef" :tab-id="props.tabId" />
                        </el-scrollbar>
                    </div>
                </div>
            </el-splitter-panel>
            <el-splitter-panel class="run-debug-logger-panel">
                <div class="run-debug-logger-wrap">
                    <div class="run-debug-panel-inner">
                        <ToolLogger :tab-id="props.tabId">
                            <template #actions>
                                <ToolExecutorActions />
                            </template>
                        </ToolLogger>
                    </div>
                </div>
            </el-splitter-panel>
        </el-splitter>
    </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import ToolExecutor from './tool-executor.vue';
import ToolLogger from './tool-logger.vue';
import ToolExecutorActions from './tool-executor-actions.vue';

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const executorRef = ref<InstanceType<typeof ToolExecutor> | null>(null);
provide('toolExecutorRef', executorRef);
provide('toolExecutorReset', () => executorRef.value?.resetForm?.());
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