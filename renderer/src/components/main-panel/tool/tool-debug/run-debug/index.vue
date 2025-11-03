<template>
    <div class="run-debug-container">
        <ToolExecutor :tab-id="props.tabId"></ToolExecutor>
        <ToolLogger :tab-id="props.tabId"></ToolLogger>
    </div>
</template>

<script setup lang="ts">
import ToolExecutor from './tool-executor.vue';
import ToolLogger from './tool-logger.vue';


const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});
</script>

<style scoped>
.run-debug-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}
</style>