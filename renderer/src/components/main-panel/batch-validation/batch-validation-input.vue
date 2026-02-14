<template>
    <div class="batch-validation-input-wrapper">
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
            :ref="el => editorRef = el"
            :tab-id="-1"
            v-model="inputValue"
            :placeholder="placeholder"
            enter-inserts-newline
            @keydown="(e: KeyboardEvent) => handleSlashKeydown(e)"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, provide } from 'vue';
import { useI18n } from 'vue-i18n';
import { listSkills, type SkillMetadata } from '@/api/skill';
import KRichTextarea from '../chat/chat-box/rich-textarea.vue';
import type { ChatStorage, ChatSetting } from '../chat/chat-box/chat';
import { llmManager } from '@/views/setting/llm';
import { v4 as uuidv4 } from 'uuid';

const { t } = useI18n();

const props = defineProps<{
    modelValue: string;
    placeholder?: string;
    sourceStorage: ChatStorage | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: string): void;
}>();

const editorRef = ref<InstanceType<typeof KRichTextarea> | null>(null);

const inputValue = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v)
});

// 为当前测试用例创建虚拟 storage，与 source 合并
const virtualStorage = ref<ChatStorage | null>(null);

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

watch(
    () => props.sourceStorage,
    (source) => {
        const base = source
            ? JSON.parse(JSON.stringify({
                ...source,
                id: uuidv4(),
                messages: []
            }))
            : createDefaultStorage();
        if (!base.settings) {
            base.settings = createDefaultStorage().settings;
        }
        virtualStorage.value = base;
    },
    { immediate: true }
);

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
:deep(.k-rich-textarea) {
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

:deep(.k-rich-textarea:hover) {
    box-shadow: 0 0 0 1px var(--el-text-color-disabled) inset !important;
    outline: none;
    transition: var(--el-transition-box-shadow);
}

:deep(.k-rich-textarea:focus-within) {
    box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
    outline: none;
    transition: var(--el-transition-box-shadow);
}

:deep(.rich-editor) {
    min-height: 120px;
    color: var(--el-input-text-color, var(--el-text-color-regular));
}

:deep(.rich-editor:empty::before) {
    color: var(--el-input-placeholder-color, var(--el-text-color-placeholder));
}
</style>
