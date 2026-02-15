<template>
    <el-tooltip :content="t('prompts')" placement="top" effect="light">
        <div class="setting-button" @click="showChoosePrompt = true; saveCursorPosition();">
            <span class="iconfont icon-chat"></span>
        </div>
    </el-tooltip>

    <!-- 与提词测试器一致的对话框：上方 tree-select 选题词，下方表单联动 -->
    <el-dialog v-model="showChoosePrompt" :title="t('prompts')" width="560px" class="prompt-fill-dialog">
        <PromptReader :tab-id="-1"
            @prompt-get-response="(msg, meta) => whenGetPromptResponse(msg, meta)" />
        <template #footer>
            <el-button @click="showChoosePrompt = false;">{{ t("cancel") }}</el-button>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { createApp, inject, ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ChatStorage, EditorContext } from '../chat';
import type { PromptsGetResponse } from '@/hook/type';

import PromptReader from '@/components/main-panel/prompt/prompt-reader.vue';
import {
    ElMessage,
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

import PromptChatItem from '../prompt-chat-item.vue';
import i18n from '@/i18n';

const { t } = useI18n();

const tabStorage = inject('tabStorage') as ChatStorage;
const showChoosePrompt = ref(false);

const editorContext = inject<EditorContext | undefined>('editorContext', undefined);
let savedSelection: Range | null = null;

function saveCursorPosition() {
    const editor = editorContext?.editor?.value;
    if (editor) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            // 检查 selection 是否在 editor 内部
            if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
                savedSelection = range;
            } else {
                savedSelection = null;
            }
        }
    }
}

async function whenGetPromptResponse(
    msg: PromptsGetResponse | string | undefined,
    meta?: { promptName: string; args: Record<string, string> }
) {
    try {

        if (!msg || typeof msg === 'string') {
            ElMessage.error(msg || '获取提示词失败');
            return;
        }
        if (!Array.isArray(msg.messages) || msg.messages.length === 0) {
            ElMessage.error('提示词返回数据格式异常');
            return;
        }

        const content = msg.messages[0].content;
        await nextTick();

        const editor = editorContext?.editor?.value;
        if (!content) {
            return;
        }
        if (!editor) {
            ElMessage.error(t('prompt-fill-no-editor') || '无法获取输入框，请确保焦点在输入区域内');
            return;
        }

        const container = document?.createElement('div');
        const promptChatItem = createApp(PromptChatItem, {
            messages: msg.messages,
            promptName: meta?.promptName,
            promptArgs: meta?.args
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

        const firstElement = container.firstElementChild;
        if (!firstElement) {
            ElMessage.error('插入失败');
            return;
        }

        await nextTick();

        if (savedSelection) {
            try {
                savedSelection.deleteContents();
                savedSelection.insertNode(firstElement);
            } catch {
                editor.appendChild(firstElement);
            }
        } else {
            editor.appendChild(firstElement);
        }

        // 设置光标到插入元素的后方
        const newRange = document.createRange();
        newRange.setStartAfter(firstElement);
        newRange.collapse(true);
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(newRange);
        }

        editor.dispatchEvent(new Event('input'));
        editor.focus();

        await nextTick();
        showChoosePrompt.value = false;
    } catch (error) {
        ElMessage.error((error as Error).message);
    }
}

</script>

<style>
.icon-length {
    font-size: 16px;
}
</style>