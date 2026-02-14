<template>
    <el-scrollbar height="100%">
        <div class="tool-module">
            <div class="right">
                <RunDebug :tab-id="props.tabId" />
            </div>
        </div>
    </el-scrollbar>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import RunDebug from './run-debug/index.vue';

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});
</script>

<style scoped>
/* 使内部 scrollbar 的 view 占满高度，run-debug-container 的 100% 才能解析 */
:deep(.el-scrollbar__wrap),
:deep(.el-scrollbar__view) {
    height: 100%;
}

.tool-module {
    height: 100%;
    display: flex;
    justify-content: stretch;
}

.tool-module .right {
    flex: 1;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
}
</style>