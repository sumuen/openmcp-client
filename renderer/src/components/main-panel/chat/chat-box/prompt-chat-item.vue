<template>
    <el-popover
        placement="top"
        :width="420"
        trigger="click"
        popper-class="rich-card-prompt-popover"
        persistent
    >
        <template #default>
            <RichCardPromptPopoverContent
                :item="promptItem"
                @update:item="applyItemToDom"
            />
        </template>
        <template #reference>
            <span
                ref="rootRef"
                class="chat-prompt-item rich-card-prompt"
                contenteditable="false"
                :data-rich-type="'prompt'"
                :data-full-text="promptItem.text"
                :data-prompt-name="props.promptName ?? undefined"
                :data-prompt-args="promptItem.args && Object.keys(promptItem.args).length > 0 ? JSON.stringify(promptItem.args) : undefined"
            >
                <span class="iconfont icon-chat"></span>
                <span class="real-text rich-card-prompt__label">{{ promptItem.text }}</span>
            </span>
        </template>
    </el-popover>
</template>

<script setup lang="ts">
import type { PromptsGetResponse } from '@/hook/type';
import { computed, defineProps, ref, type PropType } from 'vue';
import type { PromptTextItem } from './chat';
import RichCardPromptPopoverContent from '../message/rich-card-prompt-popover-content.vue';

const props = defineProps({
    messages: {
        type: Array as PropType<PromptsGetResponse['messages']>,
        required: true
    },
    promptName: { type: String, default: undefined },
    promptArgs: { type: Object as PropType<Record<string, string>>, default: undefined }
});

const rootRef = ref<HTMLElement | null>(null);
/** 在编辑器中修改表单后缓存的 item，保证弹窗内显示与 DOM 一致 */
const localItem = ref<PromptTextItem | null>(null);

const promptItem = computed<PromptTextItem>(() => {
    if (localItem.value) return localItem.value;
    return {
        type: 'prompt',
        text: props.messages[0]?.content?.text ?? '',
        ...(props.promptName && { name: props.promptName }),
        ...(props.promptArgs && Object.keys(props.promptArgs).length > 0 && { args: props.promptArgs })
    };
});

function applyItemToDom(newItem: PromptTextItem) {
    localItem.value = newItem;
    const el = rootRef.value;
    if (!el) return;
    el.setAttribute('data-full-text', newItem.text);
    const realText = el.querySelector('.real-text');
    if (realText) realText.textContent = newItem.text;
    if (newItem.args && Object.keys(newItem.args).length > 0) {
        el.setAttribute('data-prompt-args', JSON.stringify(newItem.args));
    } else {
        el.removeAttribute('data-prompt-args');
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
}
</script>

<style scoped>
.chat-prompt-item {
    max-width: 120px;
    display: inline-flex;
    border-radius: 0.3em;
    align-items: center;
    padding: 0 6px;
    cursor: pointer;
    background-color: #373839;
    border: 1px solid var(--foreground);
    font-size: var(--chat-font-size-sm, 13px);
    margin: 0 2px;
    user-select: none;
}

.chat-prompt-item .iconfont {
    margin-right: 4px;
}

.chat-prompt-item .real-text {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
