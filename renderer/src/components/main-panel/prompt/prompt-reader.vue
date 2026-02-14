<template>
    <div>
        <h3>{{ currentPrompt?.name }}</h3>
    </div>
    <div class="prompt-reader-container">
        <!-- 加载已保存的测试数据 -->
        <div v-if="currentPrompt && savedDataList.length > 0" class="saved-data-bar">
            <span class="saved-data-label">{{ t('load-test-data') }}:</span>
            <el-select
                v-model="selectedSavedName"
                :placeholder="t('choose-saved-test-data')"
                clearable
                class="saved-data-select"
                @change="handleLoadSaved"
            >
                <el-option
                    v-for="item in savedDataList"
                    :key="item.name"
                    :label="item.name"
                    :value="item.name"
                />
            </el-select>
        </div>

        <el-form :model="tabStorage.formData" :rules="formRules" ref="formRef" label-position="top">
            <el-form-item v-for="param in currentPrompt?.arguments" :key="param.name"
                :label="param.name" :prop="param.name">
                <el-input v-model="tabStorage.formData[param.name]"
                    :placeholder="t('enter') +' ' + param.name"
                    @keydown.enter.prevent="handleSubmit"
                />
            </el-form-item>

            <el-form-item>
                <el-button type="primary" :loading="loading" @click="handleSubmit">
                    {{ t('read-prompt') }}
                </el-button>
                <el-button @click="resetForm">
                    {{ t('reset') }}
                </el-button>
                <el-button @click="openSaveDialog" :disabled="!currentPrompt">
                    {{ t('save-test-data') }}
                </el-button>
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
</template>

<script setup lang="ts">
import { defineComponent, defineProps, defineEmits, watch, ref, computed, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { tabs } from '../panel';
import type { PromptStorage, SavedTestDataSet } from './prompts';
import { sharedPromptTestData } from './prompt-store';
import type { PromptsGetResponse } from '@/hook/type';
import { mcpClientAdapter } from '@/views/connect/core';

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

const currentPrompt = computed(() => {

    for (const client of mcpClientAdapter.clients) {
        const prompt = client.promptTemplates?.get(tabStorage.currentPromptName);
        if (prompt) {
            return prompt;
        }
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
    const newForm: Record<string, any> = {};
    currentPrompt.value.arguments.forEach((param) => {
        newForm[param.name] = item.data[param.name] !== undefined ? item.data[param.name] : '';
    });
    tabStorage.formData = newForm;
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

    const res = await mcpClientAdapter.readPromptTemplate(
        currentPrompt.value?.name || '',
        JSON.parse(JSON.stringify(tabStorage.formData))
    );

    tabStorage.lastPromptGetResponse = res;
    emits('prompt-get-response', res);
}

if (props.tabId >= 0) {
    watch(() => tabStorage.currentPromptName, () => {
        initFormData();
        resetForm();
        selectedSavedName.value = null;
    }, { immediate: true });
}

onMounted(() => {
    initFormData();
});

</script>

<style>
.prompt-reader-container {
    background-color: var(--background);
    padding: 10px 12px;
    border-radius: .5em;
    margin-bottom: 15px;
}

.saved-data-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.saved-data-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
}

.saved-data-select {
    flex: 1;
    min-width: 0;
}
</style>