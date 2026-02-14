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
.tool-module {
    height: 100%;
    display: flex;
    justify-content: stretch;
}

.tool-module .right {
    flex: 1;
    width: 100%;
    min-width: 0;
}
</style>