<template>
    <div class="prompt-logger">
        <div class="prompt-logger-header">
            <div class="prompt-logger-header-left">
                <div class="response-type-tabs">
                    <div
                        class="response-type-tab"
                        :class="{ 'is-selected': !showRawJson }"
                        @click="showRawJson = false"
                    >
                        Text
                    </div>
                    <div
                        class="response-type-tab"
                        :class="{ 'is-selected': showRawJson }"
                        @click="showRawJson = true"
                    >
                        JSON
                    </div>
                </div>
            </div>
            <div class="prompt-logger-header-actions">
                <slot name="actions"></slot>
            </div>
        </div>
        <div class="prompt-logger-body">
            <el-scrollbar>
                <div class="output-content" contenteditable="false">
                    <template v-if="!showRawJson">
                        <div v-if="typeof tabStorage.lastPromptGetResponse === 'string'" class="error-tool-call">
                            <span>{{ tabStorage.lastPromptGetResponse }}</span>
                        </div>
                        <template v-else>
                            <div
                                v-for="(message, index) in (tabStorage.lastPromptGetResponse?.messages || [])"
                                :key="index"
                                class="tool-call-block"
                            >
                                <pre class="tool-call-text">{{ message.content?.text ?? '' }}</pre>
                            </div>
                        </template>
                    </template>
                    <template v-else>
                        <json-render :json="tabStorage.lastPromptGetResponse" />
                    </template>
                </div>
            </el-scrollbar>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, defineProps, computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { tabs } from '../panel';
import type { PromptStorage } from './prompts';
import JsonRender from '@/components/json-render/index.vue';

defineComponent({ name: 'prompt-logger' });
const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as PromptStorage;

const showRawJson = ref(false);

</script>

<style>
.prompt-logger {
    border-radius: .5em;
    background-color: var(--background);
    padding: 10px;
    padding-bottom: 20px;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.prompt-logger-header {
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.prompt-logger-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.prompt-logger-header-actions {
    display: flex;
    align-items: center;
}

/* 与 tool-logger 一致的响应类型选项卡 */
.response-type-tabs {
    display: flex;
    align-items: stretch;
    gap: 0;
    font-size: 12px;
}

.response-type-tab {
    opacity: 0.5;
    padding: 6px 12px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
}

.response-type-tab:hover {
    color: var(--el-text-color-regular);
}

.response-type-tab.is-selected {
    opacity: 1;
    border-bottom-color: var(--el-text-color-regular);
}

.prompt-logger-body {
    flex: 1;
    min-height: 0;
}

.prompt-logger-body .el-scrollbar {
    height: 100%;
}

.prompt-logger .output-content {
    border-radius: .5em;
    padding: 15px;
    min-height: 100%;
    height: fit-content;
    font-family: var(--code-font-family);
}

.error-tool-call {
    background-color: rgba(245, 108, 108, 0.5);
    padding: 5px 9px;
    border-radius: .5em;
}

.tool-call-text {
    font-family: var(--code-font-family, monospace);
    font-size: 15px;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    color: var(--el-text-color-primary, #222);
}
</style>