<template>
    <div class="tc-input-toolbar">
        <el-tooltip :content="t('skill-path')" placement="top" effect="light">
            <div
                class="setting-button"
                :class="{ 'active': !!modelValue.skillName }"
                @click="showSkillDialog = true"
            >
                <span class="skill-label">SKILL</span>
            </div>
        </el-tooltip>

        <!-- Skill 对话框：无取消按钮，确认右对齐，与提示词调试按钮组一致 + Ctrl+Enter -->
        <el-dialog v-model="showSkillDialog" :title="t('skill-path')" width="480px" class="chat-option-dialog">
            <div @keydown.ctrl.enter.prevent="confirmSkill">
                <el-select
                    v-model="localSkillName"
                    :placeholder="t('batch-validation-choose-skill')"
                    clearable
                    filterable
                    style="width: 100%"
                >
                    <el-option
                        v-for="skill in skills"
                        :key="skill.name"
                        :value="skill.name"
                        :label="skill.name"
                    >
                        <span>{{ skill.name }}</span>
                        <span v-if="skill.description" class="skill-option-desc"> — {{ skill.description }}</span>
                    </el-option>
                </el-select>
                <div v-if="skills.length === 0" class="skill-empty">{{ t('skill-no-available') || 'No skills configured' }}</div>
            </div>
            <template #footer>
                <div class="dialog-footer-right">
                    <el-button type="primary" class="btn-execute" @click="confirmSkill">
                        <span>{{ t('confirm') }}</span>
                        <span class="ctrl">CTRL</span>
                        <span class="iconfont icon-enter"></span>
                    </el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { listSkills, type SkillMetadata } from '@/api/skill';

const { t } = useI18n();

interface TcOverrides {
    skillName?: string;
}

const props = defineProps<{
    modelValue: TcOverrides;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: TcOverrides): void;
}>();

const showSkillDialog = ref(false);
const localSkillName = ref('');
const skills = ref<SkillMetadata[]>([]);

function confirmSkill() {
    emit('update:modelValue', {
        ...props.modelValue,
        skillName: localSkillName.value || undefined
    });
    showSkillDialog.value = false;
}

watch(() => props.modelValue, (v) => {
    localSkillName.value = v.skillName || '';
}, { immediate: true });

watch(showSkillDialog, async (v) => {
    if (v) {
        localSkillName.value = props.modelValue.skillName || '';
        skills.value = await listSkills();
    }
});
</script>

<style scoped>
/* 与批量验证左侧「添加」按钮样式完全一致 */
.tc-input-toolbar {
    display: flex;
    gap: 8px;
    padding: 6px 0 0 0;
}

.setting-button {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--main-light-color-70);
    background-color: var(--main-light-color-20);
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    transition: var(--animation-3s);
}

.setting-button:hover {
    border: 1px solid var(--main-light-color-90);
    background-color: var(--main-light-color-40);
}

.setting-button .iconfont,
.setting-button .skill-label {
    color: var(--main-light-color-70);
}


.skill-label {
    font-size: 11px;
    font-weight: 500;
}

.skill-option-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.skill-empty {
    margin-top: 12px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
}

/* 与提示词调试 executor-actions 一致的确认按钮：右对齐 + 快捷键说明 */
.dialog-footer-right {
    display: flex;
    justify-content: flex-end;
    align-items: center;
}
.dialog-footer-right .btn-execute {
    border-radius: 8px;
    border: 1px solid var(--main-light-color-70);
    background-color: var(--main-light-color-20);
    color: var(--el-text-color-primary);
    font-weight: 600;
    padding: 8px 18px;
    font-size: 14px;
}
.dialog-footer-right .btn-execute:hover:not(:disabled),
.dialog-footer-right .btn-execute:focus {
    background-color: var(--main-light-color-50);
    border-color: var(--main-light-color-90);
}
.dialog-footer-right .btn-execute .ctrl {
    margin-left: 5px;
    opacity: 0.6;
    font-weight: 100;
}
.dialog-footer-right .btn-execute .iconfont {
    color: var(--main-color);
}
</style>
