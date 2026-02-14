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
            <el-button @click="showSkillDialog = false">{{ t("cancel") }}</el-button>
            <el-button type="primary" @click="showSkillDialog = false">{{ t("confirm") }}</el-button>
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
</style>
