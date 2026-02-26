<template>
    <!-- 下侧的设置按钮 -->
    <Setting :tabId="tabId" v-model="modelValue" />

    <!-- 编辑区 -->
    <div class="k-rich-textarea">
        <div
            :ref="el => editor = el"
            contenteditable="true"
            class="rich-editor"
            :placeholder="placeholder"
            @input="handleInput"
            @paste="handlePaste"
            @keydown="(e: KeyboardEvent) => emit('keydown', e)"
            @keydown.backspace="handleBackspace"
            @keydown.enter="handleKeydown"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
        ></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch, onMounted, nextTick } from 'vue';
import { createApp } from 'vue';

import Setting from './options/setting.vue';
import type { RichTextItem, PromptTextItem, ResourceTextItem } from './chat';
import PromptChatItem from './prompt-chat-item.vue';
import i18n from '@/i18n';
import {
    ElTooltip,
    ElPopover,
    ElButtonGroup,
    ElButton,
    ElForm,
    ElFormItem,
    ElInput,
    ElScrollbar,
    ElMention
} from 'element-plus';

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    },
    modelValue: {
        type: String,
        required: true
    },
    /** 富文本结构（提词卡片等），用于 refresh 后恢复卡片展示 */
    modelRichContent: {
        type: Array as () => RichTextItem[],
        default: undefined
    },
    placeholder: {
        type: String,
        default: '输入消息...'
    },
    customClass: {
        type: String,
        default: ''
    },
    /** 为 true 时 Enter 插入换行而非发送（用于批量验证等多行输入） */
    enterInsertsNewline: {
        type: Boolean,
        default: false
    },
    /** 为 true 时从 modelValue/modelRichContent 同步到编辑器（用于批量验证等需要持久化恢复的场景） */
    syncValueToEditor: {
        type: Boolean,
        default: false
    }
});

const modelValue = computed({
    get() {
        return props.modelValue;
    },
    set(value: string) {
        emit('update:modelValue', value);
    }
})

const emit = defineEmits(['update:modelValue', 'update:richContent', 'pressEnter', 'keydown']);

const editor = ref<any>(null);

provide('editorContext', {
    editor,
});

/** 将 RichTextItem[] 渲染到编辑器 DOM */
function renderRichContentToEditor(el: HTMLDivElement, items: RichTextItem[]) {
    el.innerHTML = '';
    for (let i = 0; i < items.length; i++) {
        if (i > 0) {
            el.appendChild(document.createTextNode(' '));
        }
        const item = items[i];
        if (item.type === 'text') {
            if (item.text) {
                el.appendChild(document.createTextNode(item.text));
            }
        } else if (item.type === 'prompt') {
            const p = item as PromptTextItem;
            const container = document.createElement('div');
            const promptChatItem = createApp(PromptChatItem, {
                messages: [{ role: 'user', content: { type: 'text', text: p.text } }],
                promptName: p.name,
                promptArgs: p.args
            });
            promptChatItem
                .use(i18n)
                .use(ElTooltip)
                .use(ElPopover)
                .use(ElButtonGroup)
                .use(ElButton)
                .use(ElForm)
                .use(ElFormItem)
                .use(ElInput)
                .use(ElScrollbar)
                .use(ElMention);
            promptChatItem.mount(container);
            const first = container.firstElementChild;
            if (first) el.appendChild(first);
        } else if (item.type === 'resource') {
            const r = item as ResourceTextItem;
            const span = document.createElement('span');
            span.className = 'chat-prompt-item chat-resource-item';
            span.setAttribute('contenteditable', 'false');
            span.setAttribute('data-rich-type', 'resource');
            span.setAttribute('data-full-text', r.text);
            span.innerHTML = '<span class="iconfont icon-file"></span><span class="real-text">' + escapeHtml(r.text) + '</span>';
            el.appendChild(span);
        }
    }
}

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

/** 将 modelValue / modelRichContent 同步到编辑器 DOM（用于加载/切换后恢复内容） */
function syncModelValueToEditor() {
    if (!props.syncValueToEditor) return;
    const el = editor.value;
    if (!(el instanceof HTMLDivElement)) return;
    if (el.contains(document.activeElement)) return;

    const richItems = props.modelRichContent;
    if (richItems && richItems.length > 0) {
        renderRichContentToEditor(el, richItems);
        return;
    }
    if (!props.modelValue) {
        /* 当 modelValue 为空时必须清空编辑器，避免切换用例时显示旧内容（如交互测试内容） */
        if (el.textContent?.trim()) el.textContent = '';
        return;
    }
    const currentText = el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE
        ? (el.childNodes[0].textContent || '')
        : Array.from(el.querySelectorAll('.real-text')).map(n => n.textContent || '').join(' ').trim();
    if (currentText === props.modelValue) return;
    el.textContent = props.modelValue;
}

onMounted(() => {
    if (!props.syncValueToEditor) return;
    nextTick(() => {
        const el = editor.value;
        if (!(el instanceof HTMLDivElement)) return;
        const richItems = props.modelRichContent;
        if (richItems && richItems.length > 0 && !el.textContent?.trim()) {
            renderRichContentToEditor(el, richItems);
        } else if (props.modelValue && !el.textContent?.trim()) {
            el.textContent = props.modelValue;
        } else if (!props.modelValue && !richItems?.length) {
            el.textContent = '';
        }
    });
});

watch(() => [props.modelValue, props.modelRichContent], () => {
    syncModelValueToEditor();
}, { flush: 'post', deep: true });

function handleBackspace(event: KeyboardEvent) {
    // 自定义 Backspace 行为
    const editorElement = editor.value;
    if (!(editorElement instanceof HTMLDivElement)) {
        return;
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
        return;
    }

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;

    // 如果光标在 rich-item 或 chat-prompt-item 元素中，阻止默认行为并删除整个块
    const parent = startContainer.parentElement;
    const inRichItem = parent?.classList.contains('rich-item');
    const inChatPrompt = parent?.closest('.chat-prompt-item');
    if (inRichItem || inChatPrompt) {
        event.preventDefault();
        let toRemove: HTMLElement | null = inRichItem ? parent : inChatPrompt as HTMLElement;
        if (toRemove) {
            // 找到 editor 的直接子节点（整块）并移除
            while (toRemove.parentElement && toRemove.parentElement !== editorElement) {
                toRemove = toRemove.parentElement;
            }
            toRemove?.remove();
        }
    }
}

function handleInput(event: Event) {
    const editorElement = editor.value;
    if (!(editorElement instanceof HTMLDivElement)) {
        return;
    }
    const fragments: string[] = [];

    editorElement.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {

            fragments.push(node.textContent || '');
        } else {
            const element = node as HTMLElement;

            const collection = element.getElementsByClassName('real-text');
            const fragmentText = extractTextFromCollection(collection);
            
            fragments.push(fragmentText || '');
        }
    });

    emit('update:modelValue', fragments.join(' '));
    emit('update:richContent', extractRichContentFromEditor(editorElement));
}

function extractTextFromCollection(collection: HTMLCollection) {
    const texts = [];
    for (let i = 0; i < collection.length; i++) {
        texts.push(collection[i].textContent); // 或 .innerText
    }
    return texts.join('');
}

/** 从 editor DOM 提取富文本结构，用于历史记录持久化 */
function extractRichContentFromEditor(editorElement: HTMLDivElement | null): RichTextItem[] {
    const items: RichTextItem[] = [];
    if (!editorElement) return items;

    editorElement.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent || '').trim();
            if (text) items.push({ type: 'text', text });
        } else {
            const el = node as HTMLElement;
            const promptItem = el.classList?.contains('chat-prompt-item') ? el : el.querySelector?.('.chat-prompt-item');
            if (promptItem) {
                const richType = (promptItem as HTMLElement).getAttribute?.('data-rich-type');
                const fullText = (promptItem as HTMLElement).getAttribute?.('data-full-text')
                    || promptItem.querySelector?.('.real-text')?.textContent || '';
                if (richType === 'prompt') {
                    const name = (promptItem as HTMLElement).getAttribute?.('data-prompt-name') ?? undefined;
                    let args: Record<string, string> | undefined;
                    try {
                        const argsStr = (promptItem as HTMLElement).getAttribute?.('data-prompt-args');
                        if (argsStr) args = JSON.parse(argsStr) as Record<string, string>;
                    } catch { /* ignore */ }
                    items.push({ type: 'prompt', text: fullText, ...(name && { name }), ...(args && Object.keys(args).length > 0 && { args }) });
                } else if (richType === 'resource') {
                    items.push({ type: 'resource', text: fullText });
                } else {
                    if (fullText) items.push({ type: 'text', text: fullText });
                }
            } else {
                const realText = el.querySelector?.('.real-text')?.textContent?.trim();
                if (realText) items.push({ type: 'text', text: realText });
            }
        }
    });
    return items;
}

const isComposing = ref(false);

defineExpose({
    editor,
    handleBackspace,
    handleInput,
    extractRichContent: () => extractRichContentFromEditor(editor.value),
});

function handleKeydown(event: KeyboardEvent) {
    
    if (event.key === 'Enter' && !event.shiftKey && !isComposing.value) {
        if (props.enterInsertsNewline) {
            // 插入换行，不阻止默认
            return;
        }
        event.preventDefault();
        const editorElement = editor.value;
        if (!(editorElement instanceof HTMLDivElement)) {
            return;
        }

        // 清空
        editorElement.innerHTML = '';

        emit('pressEnter', event);

    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {

        const editorElement = editor.value;
        if (!(editorElement instanceof HTMLDivElement)) {
            return;
        }

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) {
            return;
        }

        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;

        if (event.key === 'ArrowLeft') {
            // 检查左侧节点
            const previousSibling = startContainer.previousSibling;
            if (previousSibling && previousSibling.nodeType !== Node.TEXT_NODE) {
                event.preventDefault();
                range.setStartBefore(previousSibling);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } else if (event.key === 'ArrowRight') {
            // 检查右侧节点
            const nextSibling = startContainer.nextSibling;
            if (nextSibling && nextSibling.nodeType !== Node.TEXT_NODE) {
                event.preventDefault();
                range.setStartAfter(nextSibling);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }
}

function handlePaste(event: ClipboardEvent) {
    event.preventDefault(); // 阻止默认粘贴行为
    const clipboardData = event.clipboardData;
    if (clipboardData) {
        const pastedText = clipboardData.getData('text/plain');
        const editorElement = editor.value;
        if (editorElement instanceof HTMLDivElement) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                const textNode = document?.createTextNode(pastedText);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    if (editor.value) {
        editor.value.dispatchEvent(new Event('input'));
    }
}

function handleCompositionStart() {
    isComposing.value = true;
}

function handleCompositionEnd() {
    isComposing.value = false;
}

</script>

<style>
.k-rich-textarea {
    border: 1px solid var(--input-border);
    background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
    background-image: none;
    border-radius: 16px;
    box-sizing: border-box;
    color: var(--input-foreground);
    padding: 10px;
    display: inline-block;
    font-size: var(--chat-font-size);
    position: relative;
    vertical-align: bottom;
    width: 100%;
    min-height: 50px;
    transition: var(--animation-3s);
}

.k-rich-textarea:focus-within {
    border-color: var(--input-active-border);
    outline: none;
}

.rich-editor {
    min-height: 100px;
    outline: none;
    padding-bottom: 20px;
    white-space: pre-wrap;
    cursor: text;
}

.rich-editor:empty::before {
    content: attr(placeholder);
    color: var(--input-placeholder);
    cursor: text;
}

.rich-item {
    padding: 2px 4px;
    border-radius: 4px;
    margin: 0 2px;
}

.rich-item-prompt {
    background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
    color: var(--link-foreground);
}

.rich-item-resource {
    background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
    color: var(--foreground);
}

.chat-resource-item {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
    font-size: var(--chat-font-size-xs);
}

.chat-resource-item .iconfont {
    margin-right: 4px;
}

</style>