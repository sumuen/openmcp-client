<template>
    <div class="run-debug-container">
        <ToolExecutor ref="executorRef" :tab-id="props.tabId" />
        <div class="run-debug-logger-wrap">
            <ToolLogger :tab-id="props.tabId">
                <template #actions>
                    <ToolExecutorActions />
                </template>
            </ToolLogger>
        </div>
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
</script>

<style scoped>
.run-debug-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.run-debug-logger-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}
</style>