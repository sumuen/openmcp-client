<template>
    <el-tooltip :content="t('skill-path')" placement="top" effect="light">
        <div class="setting-button" :class="{ 'active': hasSkillPath }" @click="showSkillDialog = true">
            <span class="skill-label">SKILL</span>
        </div>
    </el-tooltip>

    <el-dialog v-model="showSkillDialog" :title="t('skill-path')" width="560px" class="chat-option-dialog">
        <el-input
            v-model="mcpSetting.skillPath"
            :placeholder="'.cursor/skills/code-review or path to SKILL.md'"
            clearable
            show-word-limit
            maxlength="512"
            @input="safeSaveSetting"
        >
            <template #prepend>
                <span class="iconfont icon-filepath"></span>
            </template>
        </el-input>
        <div class="skill-tip">
            {{ t('skill-path-tip') || 'Path to SKILL.md file or skill directory. When set, skill content is added to system prompt and read_skill_file tool is enabled.' }}
        </div>
        <template #footer>
            <div class="skill-dialog-footer">
                <el-button-group class="executor-actions-group">
                    <el-button class="btn-secondary" @click="showSkillDialog = false">{{ t("cancel") }}</el-button>
                    <el-button type="primary" class="btn-execute" @click="showSkillDialog = false">{{ t("confirm") }}</el-button>
                </el-button-group>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { mcpSetting } from '@/hook/mcp';
import { debounce } from 'lodash';
import { saveSetting } from '@/hook/setting';

const { t } = useI18n();
const showSkillDialog = ref(false);

const hasSkillPath = computed(() => {
    return !!mcpSetting.skillPath?.trim();
});

const safeSaveSetting = debounce(() => {
    saveSetting();
}, 300);
</script>

<style scoped>
.skill-label {
    font-size: var(--chat-font-size-sm);
    font-weight: 500;
}

.setting-button:hover {
    background-color: rgba(0, 0, 0, 0.1);
}

.setting-button.active {
    color: var(--el-color-primary);
}

.skill-tip {
    margin-top: 12px;
    font-size: var(--chat-font-size-sm);
    color: var(--el-text-color-secondary);
    line-height: 1.5;
}

/* Footer 按钮组：与导出/提示词对话框一致 */
.skill-dialog-footer {
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
