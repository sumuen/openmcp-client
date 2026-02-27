<template>
    <div class="batch-validation-input-wrapper">
        <div class="input-main">
        <!-- Slash 命令面板：与交互测试一致 -->
        <div v-if="showSlashMenu" class="slash-menu">
            <div
                v-for="(skill, idx) in filteredSlashSkills"
                :key="skill.name"
                class="slash-menu-item"
                :class="{ active: slashMenuIndex === idx }"
                @click="selectSlashSkill(skill)"
            >
                <span class="iconfont icon-filepath"></span>
                <span class="slash-menu-name">{{ skill.name }}</span>
                <span v-if="skill.description" class="slash-menu-desc">{{ skill.description }}</span>
            </div>
            <div v-if="filteredSlashSkills.length === 0" class="slash-menu-empty">
                {{ t('skill-no-available') || 'No skills configured' }}
            </div>
        </div>

        <KRichTextarea
            :ref="(el: any) => editorRef = el"
            :tab-id="-1"
            v-model="inputValue"
            :model-rich-content="inputRichContent"
            :placeholder="placeholder"
            enter-inserts-newline
            sync-value-to-editor
            @update:rich-content="onRichContentUpdate"
            @keydown="(e: KeyboardEvent) => handleSlashKeydown(e)"
        />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide } from 'vue';
import { useI18n } from 'vue-i18n';
import { listSkills, loadSkillContent, type SkillMetadata } from '@/api/skill';
import { mcpSetting } from '@/hook/mcp';
import KRichTextarea from '../chat/chat-box/rich-textarea.vue';
import type { ChatStorage, ChatSetting } from '../chat/chat-box/chat';
import { llmManager } from '@/views/setting/llm';
import { v4 as uuidv4 } from 'uuid';
import { tabs } from '../panel';
import { isModEnter } from '@/util/keyboard';
import type { BatchValidationStorage } from './storage';
import { ensureBatchValidationStorage } from './storage';

const { t } = useI18n();

const props = defineProps<{
    tabId: number;
    modelValue: string;
    placeholder?: string;
    sourceStorage: ChatStorage | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: string): void;
    (e: 'mod-enter'): void;
}>();

const editorRef = ref<InstanceType<typeof KRichTextarea> | null>(null);

/** 从 tabId 取 tabStorage，直接作为输入等数据的存储 */
const tab = computed(() => (props.tabId >= 0 ? tabs.content[props.tabId] : null));
const tabStorage = computed(() => {
    const tabItem = tab.value;
    if (!tabItem?.storage) return null;
    ensureBatchValidationStorage(tabItem.storage);
    return tabItem.storage as BatchValidationStorage;
});

/** 输入内容：仅读写 tabStorage 当前用例的 input，与交互测试完全隔离（tabStorage 为空时返回空） */
const inputValue = computed({
    get: () => {
        const st = tabStorage.value;
        if (!st) return '';
        const idx = st.selectedCaseIndex;
        const arr = st.testCases || [];
        const tc = arr[idx];
        return tc ? tc.input : (props.modelValue ?? '');
    },
    set: (v: string) => {
        const st = tabStorage.value;
        if (!st) {
            emit('update:modelValue', v);
            return;
        }
        const idx = st.selectedCaseIndex;
        const arr = st.testCases || [];
        const tc = arr[idx];
        if (tc) {
            tc.input = v;
        } else {
            emit('update:modelValue', v);
        }
    }
});

/** 当前用例的富文本（提词卡片等），用于刷新后恢复 */
const inputRichContent = computed(() => {
    const st = tabStorage.value;
    if (!st) return undefined;
    const idx = st.selectedCaseIndex;
    const arr = st.testCases || [];
    const tc = arr[idx];
    return tc?.inputRichContent;
});

function onRichContentUpdate(items: import('../chat/chat-box/chat').RichTextItem[]) {
    const st = tabStorage.value;
    if (!st) return;
    const idx = st.selectedCaseIndex;
    const arr = st.testCases || [];
    const tc = arr[idx];
    if (tc) {
        tc.inputRichContent = items.length > 0 ? items : undefined;
    }
}

function createDefaultStorage(): ChatStorage {
    return {
        id: uuidv4(),
        messages: [],
        settings: {
            modelIndex: llmManager.currentModelIndex,
            enableTools: [],
            enableWebSearch: false,
            temperature: 0.6,
            contextLength: 100,
            systemPrompt: '',
            enableXmlWrapper: false,
            parallelToolCalls: true
        } as ChatSetting
    };
}

const defaultStorageRef = ref<ChatStorage>(createDefaultStorage());
const virtualStorage = computed(() => props.sourceStorage ?? defaultStorageRef.value);
provide('batchValidationStorage', virtualStorage);

// Slash 命令
const showSlashMenu = ref(false);
const slashSkills = ref<SkillMetadata[]>([]);
const slashMenuIndex = ref(0);
const slashQuery = ref('');

const filteredSlashSkills = computed(() => {
    const q = slashQuery.value.toLowerCase().trim();
    if (!q) return slashSkills.value;
    return slashSkills.value.filter(s =>
        s.name.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q))
    );
});

function parseSlashCommand(text: string): { skillName: string; actualMessage: string } | null {
    const match = text.match(/^\s*\/([\w-]+)(?:\s+(.*))?$/s);
    if (!match) return null;
    return { skillName: match[1], actualMessage: (match[2] || '').trim() };
}

/** 当前输入的消息是否会包含 skill 上下文：批量验证每次运行上下文为空，仅当 skill 文件有效时显示 */
const skillValid = ref(false);
watch(() => mcpSetting.skillPath, async (path) => {
    if (!path?.trim()) {
        skillValid.value = false;
        return;
    }
    const skill = await loadSkillContent();
    skillValid.value = !!skill;
}, { immediate: true });
const willIncludeSkill = computed(() => skillValid.value);

async function loadSlashSkills() {
    slashSkills.value = await listSkills();
}

watch(inputValue, () => {
    const match = inputValue.value.match(/\/([\w-]*)$/);
    if (match) {
        slashQuery.value = match[1];
        showSlashMenu.value = true;
        slashMenuIndex.value = 0;
        loadSlashSkills();
    } else {
        showSlashMenu.value = false;
    }
});

function selectSlashSkill(skill: SkillMetadata) {
    const match = inputValue.value.match(/^(.*)\/([\w-]*)$/);
    const prefix = match ? match[1] : '';
    const insertName = skill.dirName || skill.name;
    inputValue.value = prefix + '/' + insertName + ' ';
    showSlashMenu.value = false;
}

function handleSlashKeydown(event: KeyboardEvent) {
    if (isModEnter(event)) {
        event.preventDefault();
        emit('mod-enter');
        return;
    }
    if (!showSlashMenu.value) return;
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        slashMenuIndex.value = Math.min(slashMenuIndex.value + 1, filteredSlashSkills.value.length - 1);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        slashMenuIndex.value = Math.max(slashMenuIndex.value - 1, 0);
    } else if (event.key === 'Enter' && filteredSlashSkills.value.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        selectSlashSkill(filteredSlashSkills.value[slashMenuIndex.value]);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        showSlashMenu.value = false;
    }
}

defineExpose({
    editorRef,
    virtualStorage,
    parseSlashCommand
});
</script>

<style scoped>
.batch-validation-input-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    align-items: stretch;
    gap: 8px;
}

.input-main {
    flex: 1;
    position: relative;
    min-width: 0;
}

.slash-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    max-height: 200px;
    overflow-y: auto;
    background: var(--el-input-bg-color, var(--el-fill-color-blank));
    border: 1px solid var(--el-input-border-color, var(--el-border-color));
    border-radius: var(--el-input-border-radius, var(--el-border-radius-base));
    margin-bottom: 4px;
    z-index: 100;
}

.slash-menu-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.slash-menu-item.active {
    background: var(--main-light-color-10);
}

.slash-menu-name { font-weight: 500; }
.slash-menu-desc { font-size: 12px; opacity: 0.7; }
.slash-menu-empty { padding: 12px; color: var(--el-text-color-secondary); }

/* 与 Element Plus el-input__wrapper 完全一致：默认 / hover / focus 均用 box-shadow */
:deep(.input-main .k-rich-textarea) {
    min-height: 160px;
    border: none !important;
    border-radius: var(--el-input-border-radius, var(--el-border-radius-base));
    padding: 6px 11px 1px 11px;
    box-shadow: 0 0 0 1px var(--el-input-border-color, var(--el-border-color)) inset;
    background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
    transition: var(--el-transition-box-shadow);
    font-size: var(--el-font-size-base);
    outline: none;
}

:deep(.input-main .k-rich-textarea:hover) {
    box-shadow: 0 0 0 1px var(--el-text-color-disabled) inset !important;
    outline: none;
    transition: var(--el-transition-box-shadow);
}

:deep(.input-main .k-rich-textarea:focus-within) {
    box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
    outline: none;
    transition: var(--el-transition-box-shadow);
}

:deep(.input-main .rich-editor) {
    min-height: 120px;
    color: var(--el-input-text-color, var(--el-text-color-regular));
}

:deep(.input-main .rich-editor:empty::before) {
    color: var(--el-input-placeholder-color, var(--el-text-color-placeholder));
}
</style>
