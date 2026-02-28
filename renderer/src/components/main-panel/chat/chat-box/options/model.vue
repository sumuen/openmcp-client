<template>
    <el-tooltip :content="t('choose-model')" placement="top" effect="light">
        <div class="setting-button" @click="showModelDialog = true">
            <span class="iconfont icon-model">
                {{ currentServerName }}/{{ currentModelName }}
            </span>
        </div>
    </el-tooltip>

    <!-- 模型选择对话框 -->
    <el-dialog v-model="showModelDialog" :title="t('choose-model')" width="400px" class="chat-option-dialog">
        <!-- 搜索框 -->
        <el-input v-model="searchText" :placeholder="t('search-model')" clearable style="margin-bottom: 15px;">
            <template #prefix>
                <span class="iconfont icon-search"></span>
            </template>
        </el-input>

        <!-- 模型列表 -->
        <el-scrollbar class="model-list">
            <el-radio-group v-model="selectedModelIndex" @change="onRadioGroupChange" style="width: 90%;">
                <div class="model-list">
                    <el-radio v-for="(model, index) in filteredModels" :key="index" :value="index" class="model-item">
                        {{ model }}
                    </el-radio>
                </div>
            </el-radio-group>
        </el-scrollbar>
        <template #footer>
            <div class="model-dialog-footer">
                <el-button-group class="executor-actions-group">
                    <el-button class="btn-secondary" @click="showModelDialog = false">{{ t("cancel") }}</el-button>
                    <el-button type="primary" class="btn-execute" @click="confirmModelChange">{{ t("confirm") }}</el-button>
                </el-button-group>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { saveSetting } from '@/hook/setting';
import { llmManager, llms } from '@/views/setting/llm';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Fuse from 'fuse.js';

const { t } = useI18n();

const fuse = computed(() => new Fuse(availableModels.value, {
    includeScore: true,
    threshold: 0.4, // 越低越严格，越高越宽松
}));

const showModelDialog = ref(false);
const searchText = ref('');
const selectedModelIndex = ref(llms[llmManager.currentModelIndex].models.indexOf(llms[llmManager.currentModelIndex].userModel));

const currentServerName = computed(() => {
    const currentLlm = llms[llmManager.currentModelIndex];
    if (currentLlm) {
        return currentLlm.name;
    }
    return '';
});

const currentModelName = computed(() => {
    const currentLlm = llms[llmManager.currentModelIndex];
    if (currentLlm) {
        return currentLlm.userModel;
    }
    return '';
});

const availableModels = computed(() => {
    return llms[llmManager.currentModelIndex].models;
});

const filteredModels = computed(() => {
    const term = searchText.value?.trim();
    if (!term) return availableModels.value;

    const models = fuse.value.search(term).map(result => result.item);

    // 更新 selectedModelIndex
    selectedModelIndex.value = models.indexOf(llms[llmManager.currentModelIndex].userModel);
    return models;
});

const confirmModelChange = () => {
    showModelDialog.value = false;
};

const onRadioGroupChange = (index: number) => {
    llms[llmManager.currentModelIndex].userModel = filteredModels.value[index];
    saveSetting();
};

</script>

<style>
.setting-button:hover {
    background: var(--main-light-color, #f0f8ff);
    box-shadow: 0 2px 8px 0 rgba(64, 158, 255, 0.08);
    border-color: var(--el-color-primary-light-7, #c6e2ff);
}

.setting-button:active {
    transform: scale(0.95);
}

.model-list {
    max-height: 300px;
    width: 100%;
}

.model-item {
    display: flex;
    align-items: center;
    width: 100%;
    margin-bottom: 10px;
    padding: 8px 12px;
    border-radius: 4px;
}

.model-item:hover {
    background-color: var(--el-fill-color-light);
}

/* Footer 按钮组：与导出/提示词/Skill 对话框一致 */
.model-dialog-footer {
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
    background-color: var(--main-light-color-30);
    color: var(--el-text-color-primary);
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
</style>