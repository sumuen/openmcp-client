<template>
    <el-popover
        placement="top"
        :width="popoverWidth"
        trigger="hover"
        :show-after="120"
        popper-class="rich-card-resource-popover"
    >
        <template #default>
            <div class="rich-card-resource-popover__body">
                <slot name="popover">
                    <div v-if="item.name" class="rich-card-resource-popover__title">{{ item.name }}</div>
                    <pre class="rich-card-resource-popover__text">{{ item.text }}</pre>
                    <div v-if="item.args && Object.keys(item.args).length" class="rich-card-resource-popover__args">
                        <div v-for="(val, key) in item.args" :key="key" class="arg-row">
                            <span class="arg-key">{{ key }}</span>
                            <span class="arg-value">{{ val }}</span>
                        </div>
                    </div>
                </slot>
            </div>
        </template>
        <template #reference>
            <span class="rich-card-resource" :class="{ 'rich-card-resource--readonly': readonly }">
                <span class="iconfont icon-file"></span>
                <span class="rich-card-resource__label">{{ displayText }}</span>
            </span>
        </template>
    </el-popover>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { ResourceTextItem } from '../../chat-box/chat';

const props = withDefaults(
    defineProps<{
        item: ResourceTextItem;
        label?: string;
        readonly?: boolean;
        popoverWidth?: number;
    }>(),
    { readonly: true, popoverWidth: 320 }
);

const displayText = computed(() => props.label ?? props.item.text);
</script>

<style scoped>
.rich-card-resource {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    border-radius: 0.3em;
    font-size: var(--chat-font-size-sm, 13px);
    margin: 0 2px;
    user-select: none;
    background-color: #373839;
    border: 1px solid var(--foreground);
    max-width: 120px;
}

.rich-card-resource--readonly {
    max-width: 120px;
}

.rich-card-resource .iconfont {
    margin-right: 4px;
    flex-shrink: 0;
}

.rich-card-resource__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>

<style scoped>
.rich-card-resource-popover__body {
    padding: 4px 0;
    font-size: 13px;
}
.rich-card-resource-popover__title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
}
.rich-card-resource-popover__text {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-regular);
    max-height: 240px;
    overflow: auto;
}
.rich-card-resource-popover__args {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--el-border-color-lighter);
}
.rich-card-resource-popover__args .arg-row {
    display: flex;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 12px;
}
.rich-card-resource-popover__args .arg-key {
    color: var(--el-text-color-secondary);
    min-width: 60px;
}
.rich-card-resource-popover__args .arg-value {
    color: var(--el-text-color-primary);
}
</style>
