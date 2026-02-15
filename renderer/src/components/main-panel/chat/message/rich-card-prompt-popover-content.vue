<template>
    <div class="rich-card-prompt-popover__body">
        <!-- 顶部：表单 / 纯文本 切换（仅当存在模板时显示） -->
        <div v-if="template" class="rich-card-prompt-popover__toolbar">
            <div class="rich-card-prompt-popover__title">{{ item.name }}</div>

            <el-button-group size="small">
                <el-button
                    :type="displayMode === 'form' ? 'primary' : 'default'"
                    @click="displayMode = 'form'"
                >
                    {{ t('prompt-card-mode-form') }}
                </el-button>
                <el-button
                    :type="displayMode === 'text' ? 'primary' : 'default'"
                    @click="displayMode = 'text'"
                >
                    {{ t('prompt-card-mode-text') }}
                </el-button>
            </el-button-group>
        </div>

        <!-- 表单/文本内容区：el-scrollbar 高度 400px，纯文本用 el-mention textarea（基于 el-input，滚动一致） -->
        <el-scrollbar class="rich-card-prompt-popover__scroll" max-height="400px">
            <!-- 表单模式 -->
            <template v-if="displayMode === 'form' && template">
                <el-form :model="formData" label-position="top" class="rich-card-prompt-form">
                    <el-form-item
                        v-for="param in template.arguments"
                        :key="param.name"
                        :label="param.name"
                    >
                        <el-input
                            v-model="formData[param.name]"
                            :placeholder="t('enter') + ' ' + param.name"
                            @input="onFormInput"
                        />
                    </el-form-item>
                </el-form>
            </template>

            <!-- 纯文本模式：el-mention type="textarea」（见 https://element-plus.org/en-US/component/mention#textarea） -->
            <template v-else>
                <el-mention
                    v-model="textContent"
                    type="textarea"
                    :options="mentionOptions"
                    :autosize="{ minRows: 2 }"
                    class="rich-card-prompt-popover__mention"
                    @input="onTextInput"
                />
            </template>
        </el-scrollbar>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PromptTextItem } from '../chat-box/chat';
import type { PromptTemplate } from '@/hook/type';
import { mcpClientAdapter } from '@/views/connect/core';

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        item: PromptTextItem;
    }>(),
    {}
);

const emit = defineEmits<{
    (e: 'update:item', payload: PromptTextItem): void;
}>();

/** 显示模式：表单 / 纯文本，仅当有模板时可选 */
const displayMode = ref<'form' | 'text'>('form');
const template = ref<PromptTemplate | null>(null);
const formData = ref<Record<string, string>>({});
/** 纯文本模式下的可编辑内容，与 item.text 同步 */
const textContent = ref(props.item.text);
/** el-mention 不需要下拉选项，传空数组即可作为纯 textarea 使用 */
const mentionOptions = ref<{ label: string; value: string }[]>([]);

let textDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function onTextInput() {
    if (textDebounceTimer) clearTimeout(textDebounceTimer);
    textDebounceTimer = setTimeout(() => {
        textDebounceTimer = null;
        emit('update:item', {
            type: 'prompt',
            text: textContent.value,
            ...(props.item.name && { name: props.item.name }),
            ...(props.item.args && Object.keys(props.item.args).length > 0 && { args: props.item.args })
        });
    }, 400);
}

async function loadTemplate() {
    if (!props.item.name) return;
    for (const client of mcpClientAdapter.clients) {
        const templates = await client.getPromptTemplates();
        const p = templates.get(props.item.name);
        if (p) {
            template.value = p;
            initFormData();
            return;
        }
    }
    template.value = null;
}

function initFormData() {
    if (!template.value?.arguments) return;
    const next: Record<string, string> = {};
    for (const param of template.value.arguments) {
        next[param.name] = props.item.args?.[param.name] ?? '';
    }
    formData.value = next;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function onFormInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFormToItem, 400);
}

async function applyFormToItem() {
    debounceTimer = null;
    if (!props.item.name || !template.value) return;
    const args = { ...formData.value };
    try {
        const res = await mcpClientAdapter.readPromptTemplate(props.item.name, args);
        const newText = res?.messages?.[0]?.content?.text ?? props.item.text;
        emit('update:item', {
            type: 'prompt',
            text: newText,
            name: props.item.name,
            args
        });
    } catch {
        emit('update:item', {
            type: 'prompt',
            text: props.item.text,
            name: props.item.name,
            args
        });
    }
}

watch(() => props.item.name, () => loadTemplate(), { immediate: false });
watch(
    () => props.item.args,
    () => { if (template.value) initFormData(); },
    { deep: true }
);
watch(() => props.item.text, (v) => { textContent.value = v; });
onMounted(() => {
    textContent.value = props.item.text;
    if (props.item.name) loadTemplate();
});
</script>

<style scoped>
.rich-card-prompt-popover__toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}
.rich-card-prompt-popover__title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
}
.rich-card-prompt-form {
    margin-top: 4px;
}
.rich-card-prompt-form :deep(.el-form-item) {
    margin-bottom: 10px;
}
.rich-card-prompt-form :deep(.el-form-item:last-child) {
    margin-bottom: 0;
}
.rich-card-prompt-popover__body :deep(.el-input .el-input__wrapper) {
    border: 1px solid var(--window-button-active);
    border-radius: 8px;
    box-shadow: none;
}
.rich-card-prompt-popover__body :deep(.el-input .el-input__wrapper:hover),
.rich-card-prompt-popover__body :deep(.el-input .el-input__wrapper.is-focus) {
    box-shadow: none;
    border-color: var(--window-button-active);
}
.rich-card-prompt-popover__scroll {
    margin: 0 -4px;
}
.rich-card-prompt-popover__scroll :deep(.el-scrollbar__wrap) {
    overflow-x: auto;
}
/* el-mention type="textarea"：与当前主题一致，边框使用 window-button-active */
.rich-card-prompt-popover__mention {
    width: 100%;
    margin-bottom: 8px;
}
.rich-card-prompt-popover__mention :deep(.el-textarea__inner),
.rich-card-prompt-popover__mention :deep(.el-textarea__inner:hover),
.rich-card-prompt-popover__mention :deep(.el-textarea__inner:focus) {
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
    color: var(--foreground, var(--el-text-color-primary));
    border: unset !important; 
    border-radius: var(--el-border-radius-base);
    box-shadow: unset !important; 
}
.rich-card-prompt-popover__args {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--el-border-color-lighter);
}
.rich-card-prompt-popover__args .arg-row {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 12px;
}
.rich-card-prompt-popover__args .arg-key {
    color: var(--el-text-color-secondary);
    min-width: 60px;
}
.rich-card-prompt-popover__args .arg-value {
    color: var(--el-text-color-primary);
}
</style>
