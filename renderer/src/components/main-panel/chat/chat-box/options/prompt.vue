<template>
    <el-tooltip :content="t('prompts')" placement="top" effect="light">
        <div class="setting-button" @click="showChoosePrompt = true; saveCursorPosition();">
            <span class="iconfont icon-chat"></span>
        </div>
    </el-tooltip>

    <!-- 与提示词调试一致：选题词+表单在 body，按钮组在 footer -->
    <el-dialog v-model="showChoosePrompt" :title="t('prompts')" width="560px" class="prompt-fill-dialog">
        <PromptReader
            ref="readerRef"
            :tab-id="-1"
            @prompt-get-response="(msg, meta) => whenGetPromptResponse(msg, meta)"
        />
        <template #footer>
            <div class="prompt-dialog-footer">
                <el-button-group class="executor-actions-group">
                    <el-button class="btn-secondary btn-reset" @click="readerRef?.resetForm?.()">
                        {{ readerRef?.t?.('reset') ?? t('reset') }}
                    </el-button>
                    <el-dropdown
                        trigger="hover"
                        :disabled="!readerRef?.currentPrompt || !(readerRef?.savedDataList?.length)"
                        @command="(name: string) => readerRef?.handleLoadSaved?.(name)"
                    >
                        <span
                            class="el-dropdown-link load-test-data-dropdown-link"
                            :class="{ 'is-disabled': !readerRef?.currentPrompt || !(readerRef?.savedDataList?.length) }"
                        >
                            {{ readerRef?.t?.('load-test-data') ?? t('load-test-data') }}
                            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                        </span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item
                                    v-for="item in (readerRef?.savedDataList ?? [])"
                                    :key="item.name"
                                    :command="item.name"
                                >
                                    {{ item.name }}
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                    <el-button
                        class="btn-secondary"
                        :disabled="!readerRef?.currentPrompt"
                        @click="readerRef?.openSaveDialog?.()"
                    >
                        {{ readerRef?.t?.('save-test-data') ?? t('save-test-data') }}
                    </el-button>
                    <el-button
                        type="primary"
                        :loading="readerRef?.loading"
                        :disabled="!readerRef?.currentPrompt"
                        class="btn-execute"
                        @click="readerRef?.handleSubmit?.()"
                    >
                        <span>{{ readerRef?.t?.('read-prompt') ?? t('read-prompt') }}</span>
                        <span class="ctrl">CTRL</span>
                        <span class="iconfont icon-enter"></span>
                    </el-button>
                </el-button-group>
            </div>
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
    ElMention,
    ElDropdown,
    ElDropdownMenu,
    ElDropdownItem,
    ElIcon
} from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';

import PromptChatItem from '../prompt-chat-item.vue';
import i18n from '@/i18n';

const { t } = useI18n();

const tabStorage = inject('tabStorage') as ChatStorage;
const showChoosePrompt = ref(false);
const readerRef = ref<InstanceType<typeof PromptReader> | null>(null);

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

<style scoped>
.icon-length {
    font-size: 16px;
}

/* 提词对话框 footer 按钮组：与提示词调试 executor-actions 完全一致 */
.prompt-dialog-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
}
.executor-actions-group {
    display: inline-flex;
}
.executor-actions-group .el-button:first-child {
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
}
.executor-actions-group .el-button:last-child {
    border: 1px solid var(--main-light-color-50) !important;
    border-bottom-right-radius: 8px !important;
    border-top-right-radius: 8px !important;
}
.executor-actions-group .el-button {
    border-radius: 0 !important;
    border-color: var(--window-button-active) !important;
    border-top: 1px solid var(--window-button-active);
    border-bottom: 1px solid var(--window-button-active);
    border-left: 1px solid var(--window-button-active);
    border-right: 1px solid var(--window-button-active);
    background-color: var(--el-fill-color-blank);
    color: var(--el-text-color-regular);
    padding: 8px 18px;
    font-size: 14px;
    transition: var(--animation-3s);
}
.executor-actions-group .el-button:hover:not(:disabled):not(.btn-execute) {
    border-color: var(--el-border-color-hover);
    background-color: var(--main-light-color-50);
    color: var(--el-text-color-primary);
}
.btn-reset {
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
}
.load-test-data-dropdown-link {
    cursor: pointer;
    color: var(--el-text-color-regular);
    display: flex;
    align-items: center;
    padding: 8px 18px;
    font-size: 14px;
    border-top: 1px solid var(--window-button-active);
    border-bottom: 1px solid var(--window-button-active);
    border-left: 1px solid var(--window-button-active);
    background-color: var(--el-fill-color-blank);
    transition: var(--animation-3s);
}
.load-test-data-dropdown-link:hover:not(.is-disabled) {
    color: var(--el-text-color-primary);
    background-color: var(--main-light-color-50);
}
.load-test-data-dropdown-link.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
}
.load-test-data-dropdown-link .el-icon--right {
    margin-left: 4px;
}
.executor-actions-group > *:last-child .el-button {
    border-top-right-radius: 8px !important;
    border-bottom-right-radius: 8px !important;
    border: 1px solid var(--main-light-color-70) !important;
}
.btn-execute {
    background-color: var(--main-light-color-20) !important;
    color: var(--el-text-color-primary) !important;
    border-color: var(--main-light-color-50) !important;
    font-weight: 600;
}
.btn-execute:hover:not(:disabled),
.btn-execute:focus {
    background-color: var(--main-light-color-50) !important;
    border-color: var(--main-light-color-90) !important;
}
.btn-execute .ctrl {
    margin-left: 5px;
    opacity: 0.6;
    font-weight: 100;
}
.btn-execute .iconfont {
    color: var(--main-color);
}
</style>