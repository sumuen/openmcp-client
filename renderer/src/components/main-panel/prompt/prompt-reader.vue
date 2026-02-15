<template>
    <div style="padding: 10px;">
        <div class="prompt-executor-header">
            <span class="prompt-executor-header-label">{{ t('select-prompt') }}</span>
            <el-tree-select
                v-model="selectedPromptValue"
                :data="promptTreeData"
                :render-after-expand="false"
                :placeholder="t('select-prompt')"
                :render-content="renderPromptSelectContent"
                popper-class="prompt-tree-select-dropdown"
                class="prompt-tree-select"
            />
        </div>
        <div class="prompt-executor-container">
            <el-form :model="tabStorage.formData" :rules="formRules" ref="formRef" label-position="top">
                <el-form-item v-for="param in currentPrompt?.arguments" :key="param.name"
                    :label="param.name" :prop="param.name">
                    <el-input v-model="tabStorage.formData[param.name]"
                        :placeholder="t('enter') +' ' + param.name"
                        @keydown.enter.prevent="handleSubmit"
                    />
                </el-form-item>

                <!-- 弹窗内使用（tabId < 0）时保留内联按钮，与 run-debug 的 4 个按钮逻辑一致并成组 -->
                <el-form-item v-if="props.tabId < 0">
                    <el-button-group class="inline-executor-actions">
                        <el-button class="btn-secondary" @click="resetForm">{{ t('reset') }}</el-button>
                        <el-dropdown
                            trigger="hover"
                            :disabled="!currentPrompt || !savedDataList.length"
                            @command="handleLoadSaved"
                        >
                            <el-button
                                class="btn-secondary inline-load-test-data-dropdown"
                                :disabled="!currentPrompt || !savedDataList.length"
                            >
                                {{ t('load-test-data') }}
                                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                            </el-button>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item
                                        v-for="item in savedDataList"
                                        :key="item.name"
                                        :command="item.name"
                                    >
                                        {{ item.name }}
                                    </el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                        <el-button class="btn-secondary" @click="openSaveDialog" :disabled="!currentPrompt">
                            {{ t('save-test-data') }}
                        </el-button>
                        <el-button type="primary" :loading="loading" @click="handleSubmit">
                            {{ t('read-prompt') }}
                        </el-button>
                    </el-button-group>
                </el-form-item>
            </el-form>
        </div>

    <!-- 保存测试数据对话框 -->
    <el-dialog
        v-model="saveDialogVisible"
        :title="t('save-test-data')"
        width="360px"
        @close="saveFormName = ''"
    >
        <el-input
            v-model="saveFormName"
            :placeholder="t('test-data-name-placeholder')"
            maxlength="50"
            show-word-limit
            @keydown.enter.prevent="confirmSave"
        />
        <template #footer>
            <el-button @click="saveDialogVisible = false">{{ t('cancel') }}</el-button>
            <el-button type="primary" @click="confirmSave" :disabled="!saveFormName.trim()">
                {{ t('confirm') }}
            </el-button>
        </template>
    </el-dialog>

    </div>
</template>

<script setup lang="ts">
import { defineComponent, watch, ref, computed, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { tabs } from '../panel';
import type { PromptStorage, SavedTestDataSet } from './prompts';
import { sharedPromptTestData } from './prompt-store';
import type { PromptsGetResponse } from '@/hook/type';
import { mcpClientAdapter } from '@/views/connect/core';
import { ArrowDown } from '@element-plus/icons-vue';

defineComponent({ name: 'prompt-reader' });

const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    },
    currentPromptName: {
        type: String,
        required: false
    }
});

const emits = defineEmits(['prompt-get-response']);

let tabStorage: PromptStorage;

if (props.tabId >= 0) {
    tabStorage = tabs.content[props.tabId].storage as PromptStorage;
} else {
    tabStorage = reactive({
        activeNames: [0],
        currentPromptName: props.currentPromptName || '',
        currentClientIndex: undefined as number | undefined,
        formData: {},
        lastPromptGetResponse: undefined
    });
}

if (!tabStorage.formData) {
    tabStorage.formData = {};
}

/* 迁移：将旧版按 Tab 存储的测试数据合并到全局共享 store */
if (props.tabId >= 0 && tabStorage.savedTestData && Object.keys(tabStorage.savedTestData).length > 0) {
    for (const [promptName, list] of Object.entries(tabStorage.savedTestData)) {
        if (Array.isArray(list) && list.length > 0) {
            if (!sharedPromptTestData[promptName]) {
                sharedPromptTestData[promptName] = [];
            }
            for (const item of list) {
                const exists = sharedPromptTestData[promptName].some((s) => s.name === item.name);
                if (!exists) {
                    sharedPromptTestData[promptName].push(item);
                }
            }
        }
    }
    delete tabStorage.savedTestData;
}

const formRef = ref<FormInstance>();
const loading = ref(false);
const responseData = ref<PromptsGetResponse>();
const saveDialogVisible = ref(false);
const saveFormName = ref('');
const selectedSavedName = ref<string | null>(null);

const PROMPT_VALUE_SEP = '::';

/** 下拉项自定义渲染：第一行标题，第二行描述（与 tool-executor 一致） */
function renderPromptSelectContent(h: any, { data }: { data: { label: string; description?: string } }) {
    return h('div', { class: 'tree-select-node-content' }, [
        h('div', { class: 'tree-select-node-label' }, data.label),
        data.description
            ? h('div', { class: 'tree-select-node-desc' }, data.description)
            : null
    ]);
}

/** 深度为 2 的树：一级 MCP 服务器，二级该服务器下提示词模板 */
const promptTreeData = computed(() => {
    return mcpClientAdapter.clients.map((client, index) => {
        const templates = client.promptTemplates;
        const children = templates
            ? Array.from(templates.values()).map((t) => ({
                  label: t.name,
                  value: `${index}${PROMPT_VALUE_SEP}${t.name}`,
                  description: t.description || ''
              }))
            : [];
        return {
            label: client.name,
            value: `server-${index}`,
            children
        };
    });
});

const selectedPromptValue = computed({
    get() {
        const name = tabStorage.currentPromptName;
        if (!name) return '';
        const idx = tabStorage.currentClientIndex;
        if (idx !== undefined && idx >= 0 && idx < mcpClientAdapter.clients.length) {
            const client = mcpClientAdapter.clients[idx];
            if (client.promptTemplates?.has(name)) return `${idx}${PROMPT_VALUE_SEP}${name}`;
        }
        for (let i = 0; i < mcpClientAdapter.clients.length; i++) {
            if (mcpClientAdapter.clients[i].promptTemplates?.get(name))
                return `${i}${PROMPT_VALUE_SEP}${name}`;
        }
        return '';
    },
    set(val: string) {
        if (!val || !val.includes(PROMPT_VALUE_SEP)) return;
        const sepAt = val.indexOf(PROMPT_VALUE_SEP);
        const i = Number(val.slice(0, sepAt));
        const promptName = val.slice(sepAt + PROMPT_VALUE_SEP.length);
        if (!Number.isNaN(i) && promptName) {
            tabStorage.currentClientIndex = i;
            tabStorage.currentPromptName = promptName;
            tabStorage.lastPromptGetResponse = undefined;
        }
    }
});

const currentPrompt = computed(() => {
    if (props.tabId >= 0 && tabStorage.currentClientIndex !== undefined && tabStorage.currentClientIndex >= 0) {
        const client = mcpClientAdapter.clients[tabStorage.currentClientIndex];
        if (client) {
            const prompt = client.promptTemplates?.get(tabStorage.currentPromptName);
            if (prompt) return prompt;
        }
    }
    for (const client of mcpClientAdapter.clients) {
        const prompt = client.promptTemplates?.get(tabStorage.currentPromptName);
        if (prompt) return prompt;
    }
});

const formRules = computed<FormRules>(() => {
    const rules: FormRules = {}
    currentPrompt.value?.arguments.forEach(param => {
        rules[param.name] = [
            {
                message: `${param.name} ` + t('is-required'),
                trigger: 'blur'
            }
        ]
    });

    return rules;
});

/** 当前 prompt 的已保存测试数据列表（从全局共享 store 读取） */
const savedDataList = computed<SavedTestDataSet[]>(() => {
    const name = tabStorage.currentPromptName;
    if (!name) return [];
    return sharedPromptTestData[name] || [];
});

/** 比较保存数据的 schema 与当前提示词表单是否一致，一致才允许导入 */
function isSavedDataSchemaMatch(item: SavedTestDataSet): boolean {
    if (!currentPrompt.value?.arguments?.length) return false;
    const currentKeys = new Set(currentPrompt.value.arguments.map((p) => p.name));
    const savedKeys = new Set(Object.keys(item.data || {}));
    if (currentKeys.size !== savedKeys.size) return false;
    for (const k of currentKeys) {
        if (!savedKeys.has(k)) return false;
    }
    return true;
}

function openSaveDialog() {
    saveFormName.value = '';
    saveDialogVisible.value = true;
}

function confirmSave() {
    const name = saveFormName.value.trim();
    if (!name || !currentPrompt.value) return;

    const promptName = currentPrompt.value.name;
    if (!sharedPromptTestData[promptName]) {
        sharedPromptTestData[promptName] = [];
    }

    const existing = sharedPromptTestData[promptName].find((s) => s.name === name);
    const newItem: SavedTestDataSet = {
        name,
        data: JSON.parse(JSON.stringify(tabStorage.formData)),
        createdAt: Date.now()
    };
    if (existing) {
        const idx = sharedPromptTestData[promptName].findIndex((s) => s.name === name);
        sharedPromptTestData[promptName][idx] = newItem;
    } else {
        sharedPromptTestData[promptName].push(newItem);
    }

    saveDialogVisible.value = false;
    saveFormName.value = '';
    selectedSavedName.value = null;
    ElMessage.success(t('success-save'));
}

function handleLoadSaved(name: string | null) {
    if (!name || !currentPrompt.value) return;
    const list = sharedPromptTestData[currentPrompt.value.name] || [];
    const item = list.find((s) => s.name === name);
    if (!item) return;
    if (!isSavedDataSchemaMatch(item)) {
        ElMessage.warning(t('prompt-test-data-schema-mismatch'));
        selectedSavedName.value = null;
        return;
    }
    const newForm: Record<string, any> = {};
    currentPrompt.value.arguments.forEach((param) => {
        newForm[param.name] = item.data[param.name] !== undefined ? item.data[param.name] : '';
    });
    tabStorage.formData = newForm;
    selectedSavedName.value = name;
    ElMessage.success(t('success-load-test-data'));
}

const initFormData = () => {
    if (!currentPrompt.value?.arguments) return;
    const newSchemaDataForm: Record<string, number | boolean | string> = {};    

    currentPrompt.value.arguments.forEach(param => {
        newSchemaDataForm[param.name] = '';
        if (tabStorage.formData[param.name] !== undefined) {
            newSchemaDataForm[param.name] = tabStorage.formData[param.name];
        }
    });

    tabStorage.formData = newSchemaDataForm;
}

const resetForm = () => {
    formRef.value?.resetFields();
    responseData.value = undefined;
}

async function handleSubmit() {
    if (!currentPrompt.value?.name) return;
    loading.value = true;
    try {
        const clientIndex = props.tabId >= 0 ? tabStorage.currentClientIndex : undefined;
        const res = await mcpClientAdapter.readPromptTemplate(
            currentPrompt.value.name,
            JSON.parse(JSON.stringify(tabStorage.formData)),
            clientIndex
        );
        tabStorage.lastPromptGetResponse = res;
        const meta = {
            promptName: currentPrompt.value.name,
            args: JSON.parse(JSON.stringify(tabStorage.formData)) as Record<string, string>
        };
        emits('prompt-get-response', res, meta);
    } finally {
        loading.value = false;
    }
}

watch(() => tabStorage.currentPromptName, () => {
    initFormData();
    resetForm();
    selectedSavedName.value = null;
}, { immediate: true });

onMounted(() => {
    if (!tabStorage.currentPromptName && promptTreeData.value.length > 0) {
        const first = promptTreeData.value[0];
        const firstChild = first?.children?.[0];
        if (firstChild && typeof firstChild.value === 'string' && firstChild.value.includes(PROMPT_VALUE_SEP)) {
            const val = firstChild.value as string;
            const sepAt = val.indexOf(PROMPT_VALUE_SEP);
            tabStorage.currentClientIndex = Number(val.slice(0, sepAt));
            tabStorage.currentPromptName = val.slice(sepAt + PROMPT_VALUE_SEP.length);
        }
    }
    initFormData();
});

defineExpose({
    formRef,
    resetForm,
    handleSubmit,
    openSaveDialog,
    handleLoadSaved,
    loading,
    currentPrompt,
    savedDataList,
    t
});

</script>

<style>
.prompt-executor-header {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.prompt-executor-header-label {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
}

.prompt-executor-header .prompt-tree-select {
    flex: 1;
    min-width: 0;
    max-width: 420px;
}

.prompt-executor-title {
    font-weight: 500;
    font-size: 14px;
    color: var(--el-text-color-primary);
}

/* 下拉项：第一行标题，第二行描述（与 tool-executor 一致） */
.tree-select-node-content {
    padding: 2px 0;
    min-width: 0;
}

.tree-select-node-label {
    font-weight: 500;
    margin-bottom: 4px;
}

.tree-select-node-desc {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    opacity: 0.85;
    line-height: 1.4;
    margin-top: 2px;
    max-width: 320px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

.prompt-tree-select-dropdown.el-select-dropdown .el-select-dropdown__item {
    height: auto;
    min-height: 32px;
    padding: 6px 12px;
    white-space: normal;
}

.prompt-executor-container {
    margin-top: 15px;
    background-color: var(--background);
    border-radius: .5em;
    padding: 10px 12px;
    margin-bottom: 15px;
}

.prompt-executor-container .el-button:active {
    transform: scale(0.95);
    transition: transform 0.08s;
}

/* 弹窗内 4 个按钮成组（与 run-debug executor-actions 一致） */
.inline-executor-actions {
    display: inline-flex;
}
.inline-executor-actions .btn-secondary {
    border-color: var(--el-border-color);
    background-color: var(--el-fill-color-blank);
    color: var(--el-text-color-regular);
}
.inline-executor-actions .btn-secondary:hover:not(:disabled) {
    border-color: var(--el-border-color-hover);
    background-color: var(--main-light-color-50);
    color: var(--el-text-color-primary);
}
.inline-executor-actions > .el-button:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
}
.inline-executor-actions > .el-button:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
}
.inline-load-test-data-dropdown {
    border-radius: 0 !important;
}
.inline-load-test-data-dropdown .el-icon--right {
    margin-left: 4px;
}
</style>