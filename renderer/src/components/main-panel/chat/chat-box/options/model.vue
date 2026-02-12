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
            <el-button @click="showModelDialog = false">{{ t("cancel") }}</el-button>
            <el-button type="primary" @click="confirmModelChange">{{ t("confirm") }}</el-button>
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
</style>