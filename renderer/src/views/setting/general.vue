<template>
    <div class="setting-section">
        <h2>{{ t('general-setting') }}</h2>
        <div class="setting-option">
            <span>
                <span class="iconfont icon-i18n"></span>
                <span class="option-title">{{ t('language-setting') }}</span>
            </span>
            <div style="width: 100px;">
                <el-select name="language-setting" class="language-setting" v-model="locale" @change="onlanguagechange">
                    <el-option v-for="option in languageSetting.options" :value="option.value" :label="option.text"
                        :key="option.value">
                    </el-option>
                </el-select>
            </div>
        </div>

        <div class="setting-option">
            <span>
                <span class="iconfont icon-timeout"></span>
                <span class="option-title">{{ t('mcp-server-timeout') }} (s)</span>
            </span>
            <div style="width: 200px;">
                <el-slider v-model="mcpSetting.timeout" :min="0" :max="600" :step="60" show-stops
                    @change="safeSaveSetting" />
            </div>
        </div>

        <div class="setting-option" style="flex-direction: column; height: fit-content; gap: 10px;">
            <div class="sub-item">
                <span>
                    <span class="iconfont icon-dataset"></span>
                    <span class="option-title">{{ '是否开启数据回流' }}</span>
                </span>
                <div>
                    <el-switch v-model="mcpSetting.enableDatasetReflux" @change="safeSaveConnection" />
                </div>
            </div>
            <div class="sub-item" v-if="mcpSetting.enableDatasetReflux">
                <span>
                    <span class="iconfont icon-filepath"></span>
                    <el-tooltip
                        content="存储在项目目录的 .openmcp 文件夹中"
                    >
                        <span class="option-title">{{ '数据文件名' }}</span>
                    </el-tooltip>
                </span>
                <div>
                    <el-input
                        v-model="mcpSetting.datasetName"
                        @input="safeSaveConnection"
                    >
                        <template #append>.duckdb</template>
                    </el-input>
                </div>
            </div>
        </div>

        <div class="setting-option">
            <span>
                <span class="iconfont icon-proxy"></span>
                <span class="option-title">{{ t('proxy-server') }}</span>
            </span>
            <div style="width: 200px;">
                <el-input v-model="mcpSetting.proxyServer" :placeholder="'http://localhost:7890'"
                    @input="safeSaveSetting" />
            </div>
        </div>

        <div class="setting-option">
            <span>
                <span class="iconfont icon-filepath"></span>
                <el-tooltip content="Path to SKILL.md file or skill directory (e.g. .cursor/skills/code-review). When set, skill content is added to system prompt and read_skill_file tool is enabled.">
                    <span class="option-title">{{ t('skill-path') }}</span>
                </el-tooltip>
            </span>
            <div style="flex: 1; min-width: 200px;">
                <el-input v-model="mcpSetting.skillPath" :placeholder="'.cursor/skills or path to SKILL.md'"
                    clearable @input="safeSaveSetting" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { languageSetting } from './language';
import { useI18n } from 'vue-i18n';
import { mcpSetting } from '@/hook/mcp';
import { debounce } from 'lodash';
import { saveSetting } from '@/hook/setting';
import { mcpClientAdapter } from '../connect/core';

defineComponent({ name: 'appearance' });

const { t, locale } = useI18n();

function onlanguagechange() {
    saveSetting();
}

const safeSaveSetting = debounce(() => {
    saveSetting();
}, 10);

const safeSaveConnection = debounce(async () => {
    const masterNode = mcpClientAdapter.masterNode;
    masterNode.connectionArgs.enableDatasetReflux = mcpSetting.enableDatasetReflux;
    masterNode.connectionArgs.datasetName = mcpSetting.datasetName;
    mcpClientAdapter.saveLaunchSignature();
}, 10);

onMounted(() => {
    locale.value = mcpSetting.language;
});

</script>

<style scoped>
.sub-item {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    gap: 16px;
}

.sub-item .option-title {
    flex-shrink: 0;
}

.sub-item .el-input {
    max-width: 200px;
}

.sub-item .el-switch {
    flex-shrink: 0;
}

</style>