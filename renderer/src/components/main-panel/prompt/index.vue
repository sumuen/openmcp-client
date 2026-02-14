<template>
    <div class="prompt-module">
        <div class="prompt-module-right">
            <PromptRunDebug :tab-id="props.tabId" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import PromptRunDebug from './run-debug/index.vue';

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});
</script>

<style scoped>
.prompt-module {
    padding: 20px;
    height: 100%;
    display: flex;
    justify-content: stretch;
}

.prompt-module-right {
    flex: 1;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
}
</style>