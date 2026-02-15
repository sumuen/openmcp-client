<template>
    <el-popover
        :placement="placement"
        :width="popoverWidth"
        trigger="hover"
        :show-after="100"
        popper-class="rich-card-prompt-popover"
        persistent
    >
        <template #default>
            <RichCardPromptPopoverContent
                :item="item"
                @update:item="emit('update:item', $event)"
            />
        </template>
        <template #reference>
            <span class="rich-card-prompt" :class="{ 'rich-card-prompt--readonly': readonly }">
                <span class="iconfont icon-chat"></span>
                <span class="rich-card-prompt__label">{{ displayText }}</span>
            </span>
        </template>
    </el-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PromptTextItem } from '../../chat-box/chat';
import RichCardPromptPopoverContent from './rich-card-prompt-popover-content.vue';

const props = withDefaults(
    defineProps<{
        item: PromptTextItem;
        label?: string;
        readonly?: boolean;
        popoverWidth?: number;
        placement?: 'top' | 'bottom' | 'left' | 'right';
    }>(),
    { readonly: true, popoverWidth: 420, placement: 'top' }
);

const emit = defineEmits<{
    (e: 'update:item', payload: PromptTextItem): void;
}>();

const displayText = computed(() => props.label ?? props.item.text);
</script>

<style scoped>
.rich-card-prompt {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    border-radius: 0.3em;
    font-size: var(--chat-font-size-sm, 13px);
    margin: 0 2px;
    user-select: none;
    cursor: default;
    background-color: #373839;
    border: 1px solid var(--foreground);
    max-width: 120px;
}

.rich-card-prompt--readonly {
    max-width: 120px;
}

.rich-card-prompt .iconfont {
    margin-right: 4px;
    flex-shrink: 0;
}

.rich-card-prompt__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
