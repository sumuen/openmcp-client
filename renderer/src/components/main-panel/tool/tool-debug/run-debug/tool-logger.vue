<template>
    <div class="tool-logger">
        <div class="tool-logger-header">
            <div class="tool-logger-header-left">
                <div class="response-type-tabs">
                    <div
                        v-for="item in renderMode.data"
                        :key="item.value"
                        class="response-type-tab"
                        :class="{ 'is-selected': renderMode.current === item.value }"
                        @click="renderMode.current = item.value"
                    >
                        {{ item.label }}
                    </div>
                </div>
            </div>
            <div class="tool-logger-header-actions">
                <slot name="actions"></slot>
            </div>
        </div>
        <div class="tool-logger-body">
            <el-scrollbar>
                <div class="output-content" contenteditable="false">

                <!-- TODO: 更加稳定，现在通过下面这个来判断上一次执行结果是否成功 -->
                <div v-if="typeof tabStorage.lastToolCallResponse === 'string'" class="error-tool-call">
                    <span>
                        {{ tabStorage.lastToolCallResponse }}
                    </span>
                </div>

                <div v-else>
                    <!-- 展示原本的信息 -->
                    <template v-if="renderMode.current === 'plaintext'">
                        <div
                            v-for="(c, idx) in (tabStorage.lastToolCallResponse?.content || [])"
                            :key="idx"
                            class="tool-call-block"
                        >
                            <pre class="tool-call-text">{{ c.text }}</pre>
                        </div>
                    </template>

                    <template v-else-if="renderMode.current === 'markdown'">
                        <div class="markdown" v-html="resultMarkdown"></div>
                    </template>

                    <!-- 展示 json -->
                    <template v-else-if="renderMode.current === 'json'">
                        <json-render :json="tabStorage.lastToolCallResponse" />
                    </template>
                </div>

                </div>
            </el-scrollbar>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, defineProps, computed, ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { tabs } from '../../../panel';
import type { ToolStorage } from '../../tools';
import JsonRender from '@/components/json-render/index.vue';
import { markdownToHtml } from '../../../chat/markdown/markdown';

defineComponent({ name: 'tool-logger' });
const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as ToolStorage;

const resultMarkdown = computed(() => {
    const lastToolCallResponse = tabStorage.lastToolCallResponse;
    if (!lastToolCallResponse) {
        return '';
    }
    if (typeof lastToolCallResponse === 'string') {
        return markdownToHtml(lastToolCallResponse.toString());
    }
    
    const rawText = (lastToolCallResponse.content || []).map(c => c.text).join('\n\n');
    const html = markdownToHtml(rawText);
    return html;
})

const renderMode = reactive({
	current: 'plaintext',
	data: [
		{
			value: 'plaintext',
			label: 'plaintext'
		},
		{
			value: 'markdown',
			label: 'markdown',
		},
		{
			value: 'json',
            label: 'json'
		}
	]
});

</script>

<style>
.tool-logger {
    border-radius: .5em;
    background-color: var(--background);
    padding: 10px;
    padding-bottom: 20px;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.tool-logger-body {
    flex: 1;
    min-height: 0;
}

.tool-logger-body .el-scrollbar {
    height: 100%;
}

.tool-logger .el-switch__core {
    border: 1px solid var(--main-color) !important;
    width: 60px !important;
}

.tool-logger .el-switch .el-switch__action {
    background-color: var(--main-color);
}

.tool-logger .el-switch.is-checked .el-switch__action {
    background-color: var(--sidebar);
}

.tool-logger-header {
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.tool-logger-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.tool-logger-header-actions {
    display: flex;
    align-items: center;
}

/* 响应类型：自定义 DIV 选项卡，选中项下侧高亮线 */
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

.tool-logger .output-content {
    border-radius: .5em;
    padding: 15px;
    min-height: 100%;
    height: fit-content;
    font-family: var(--code-font-family);
    background-color: var(--sidebar);
}

.error-tool-call {
    background-color: rgba(245, 108, 108, 0.5);
    padding: 5px 9px;
    border-radius: .5em;
}

.tool-call-block {
    margin-bottom: 12px;
    padding: 10px 12px;
    background: rgba(0,0,0,0.04);
    border-radius: 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
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