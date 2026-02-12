<template>
    <div :class="['json-render', { 'json-render--with-copy': showCopy }]">
        <div v-if="showCopy" class="json-render-header">
            <span class="json-render-lang">{{ label || 'JSON' }}</span>
            <button type="button" class="json-render-copy" @click="handleCopy">
                {{ copied ? t('copied') : t('copy') }}
            </button>
        </div>
        <el-scrollbar class="json-render-scrollbar" max-height="400px">
            <div class="json-render-body" ref="jsonBodyRef" v-html="renderJson(json)">
            </div>
        </el-scrollbar>
    </div>
</template>

<script setup lang="ts">
import { defineProps, type PropType, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { renderJson } from '../main-panel/chat/markdown/markdown';

const { t } = useI18n();
const jsonBodyRef = ref<HTMLElement | null>(null);
const copied = ref(false);

const props = withDefaults(
    defineProps<{
        json: any;
        showCopy?: boolean;
        label?: string;
    }>(),
    { showCopy: false, label: '' }
);

function getRawText(): string {
    if (!jsonBodyRef.value) return '';
    const codeEl = jsonBodyRef.value.querySelector('code');
    return codeEl?.textContent?.trim() ?? '';
}

async function handleCopy() {
    const text = getRawText() || JSON.stringify(props.json, null, 2);
    try {
        await navigator.clipboard.writeText(text);
        copied.value = true;
        setTimeout(() => (copied.value = false), 1500);
    } catch {
        copied.value = false;
    }
}
</script>

<style scoped>
.json-render {
    font-family: var(--font-monospace-family, var(--code-font-family, monospace));
    font-size: 13px;
    line-height: 1.6;
    letter-spacing: 0.02em;
}

.json-render--with-copy {
    border: 1px solid var(--sidebar-item-border);
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--sidebar-item-selected);
}

.json-render-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    background: var(--sidebar-item-background);
    border-bottom: 1px solid var(--sidebar-item-border);
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
}

.json-render-copy {
    padding: 2px 10px;
    border: 1px solid var(--sidebar-item-border);
    border-radius: 6px;
    background: transparent;
    color: var(--foreground);
    cursor: pointer;
    font-size: 12px;
    transition: var(--animation-3s);
}

.json-render-copy:hover {
    background: var(--sidebar-item-hover);
}

.json-render-scrollbar {
    flex: 1;
    --el-scrollbar-opacity: 0.3;
}

.json-render-body {
    padding: 12px 14px;
    display: inline-block;
    min-width: 100%;
}

.json-render-body :deep(pre) {
    margin: 0;
    padding: 0;
    background: transparent !important;
    overflow: visible;
}

.json-render-body :deep(code) {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre;
    display: block;
}
</style>