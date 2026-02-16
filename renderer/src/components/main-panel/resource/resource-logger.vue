<template>
    <div class="resource-logger">
        <div class="resource-logger-header">
            <div class="resource-logger-header-left">
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
            <div class="resource-logger-header-actions">
                <slot name="actions"></slot>
            </div>
        </div>
        <div class="resource-logger-body">
            <el-scrollbar>
                <div class="output-content" contenteditable="false">
                    <template v-if="!showRawJson">
                        <div
                            v-for="(content, index) in (tabStorage.lastResourceReadResponse?.contents || [])"
                            :key="index"
                            class="tool-call-block"
                        >
                            <span v-if="content.mimeType === 'image/png'">
                                <img
                                    class="resource-list-image"
                                    :src="getImageBlobUrlByBase64(content.blob || '', content.mimeType)"
                                    :alt="content.text"
                                    style="max-width: 100%; max-height: 300px;"
                                />
                            </span>
                            <span v-else-if="content.mimeType === 'image/jpeg'">
                                <img
                                    class="resource-list-image"
                                    :src="getImageBlobUrlByBase64(content.blob || '', content.mimeType)"
                                    :alt="content.text"
                                    style="max-width: 100%; max-height: 300px;"
                                />
                            </span>
                            <pre v-else class="tool-call-text">{{ content.text }}</pre>
                        </div>
                    </template>
                    <template v-else>
                        <json-render :json="tabStorage.lastResourceReadResponse" />
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
import type { ResourceStorage } from './resources';
import { getImageBlobUrlByBase64 } from '@/hook/util';
import JsonRender from '@/components/json-render/index.vue';

defineComponent({ name: 'resource-logger' });
const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as ResourceStorage;

const showRawJson = ref(false);

const formattedJson = computed(() => {
    try {
        return JSON.stringify(tabStorage.lastResourceReadResponse, null, 2);
    } catch {
        return 'Invalid JSON';
    }
});
</script>

<style>
.resource-logger {
    border-radius: .5em;
    background-color: var(--background);
    padding: 10px;
    padding-bottom: 20px;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.resource-logger-header {
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.resource-logger-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.resource-logger-header-actions {
    display: flex;
    align-items: center;
}

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

.resource-logger-body {
    flex: 1;
    min-height: 0;
}

.resource-logger-body .el-scrollbar {
    height: 100%;
}

.resource-logger .output-content {
    border-radius: .5em;
    padding: 15px;
    min-height: 100%;
    height: fit-content;
    font-family: var(--code-font-family);
    background-color: var(--sidebar);
}

.tool-call-text {
    font-family: var(--code-font-family, monospace);
    font-size: 15px;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    color: var(--el-text-color-primary, #222);
}

.resource-list-image {
    cursor: unset;
}
</style>