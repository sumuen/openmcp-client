<template>
    <div class="resource-module">
        <div class="resource-module-right">
            <div class="run-debug-container">
                <el-splitter layout="vertical" class="run-debug-splitter">
                    <el-splitter-panel :min="180" :max="600" :size="320" class="run-debug-executor-panel">
                        <div class="run-debug-executor-wrap">
                            <el-scrollbar height="100%">
                                <ResourceReader :tab-id="props.tabId" />
                            </el-scrollbar>
                        </div>
                    </el-splitter-panel>
                    <el-splitter-panel class="run-debug-logger-panel">
                        <div class="run-debug-logger-wrap">
                            <ResourceLogger :tab-id="props.tabId" />
                        </div>
                    </el-splitter-panel>
                </el-splitter>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import ResourceReader from './resouce-reader.vue';
import ResourceLogger from './resource-logger.vue';

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});
</script>

<style scoped>
.resource-module {
    padding: 20px;
    height: 100%;
    display: flex;
    justify-content: stretch;
}

.resource-module-right {
    flex: 1;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
}

/* 与 tool run-debug 完全一致的布局 */
.run-debug-container {
    height: 100%;
    min-height: 0;
}

.run-debug-splitter {
    height: 100%;
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

.run-debug-executor-wrap :deep(.el-scrollbar__wrap),
.run-debug-executor-wrap :deep(.el-scrollbar__view) {
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