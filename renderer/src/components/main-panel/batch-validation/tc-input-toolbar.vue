<template>
    <div class="tc-input-toolbar">
        <el-tooltip :content="t('system-prompt')" placement="top" effect="light">
            <div
                class="setting-button"
                :class="{ 'active': !!modelValue.systemPrompt }"
                @click="showPromptDialog = true"
            >
                <span class="iconfont icon-prompt"></span>
            </div>
        </el-tooltip>
        <el-tooltip :content="t('skill-path')" placement="top" effect="light">
            <div
                class="setting-button"
                :class="{ 'active': !!modelValue.skillName }"
                @click="showSkillDialog = true"
            >
                <span class="skill-label">SKILL</span>
            </div>
        </el-tooltip>

        <!-- System Prompt 对话框 -->
        <el-dialog v-model="showPromptDialog" :title="t('system-prompt')" width="600px" class="chat-option-dialog">
            <el-select
                v-model="localSystemPrompt"
                :placeholder="t('choose-presetting')"
                clearable
                style="width: 100%; margin-bottom: 12px"
            >
                <el-option
                    v-for="prompt in systemPrompts"
                    :key="prompt.name"
                    :value="prompt.name"
                    :label="prompt.name"
                />
            </el-select>
            <el-input
                v-if="localSystemPrompt"
                :model-value="currentPromptContent"
                type="textarea"
                :rows="6"
                :placeholder="t('system-prompt.placeholder')"
                readonly
            />
            <template #footer>
                <el-button @click="showPromptDialog = false">{{ t('cancel') }}</el-button>
                <el-button type="primary" @click="confirmPrompt">{{ t('confirm') }}</el-button>
            </template>
        </el-dialog>

        <!-- Skill 对话框 -->
        <el-dialog v-model="showSkillDialog" :title="t('skill-path')" width="480px" class="chat-option-dialog">
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
            <template #footer>
                <el-button @click="showSkillDialog = false">{{ t('cancel') }}</el-button>
                <el-button type="primary" @click="confirmSkill">{{ t('confirm') }}</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { systemPrompts, getSystemPrompt, loadSystemPrompts } from '../chat/chat-box/options/system-prompt';
import { listSkills, type SkillMetadata } from '@/api/skill';

const { t } = useI18n();

interface TcOverrides {
    systemPrompt?: string;
    skillName?: string;
}

const props = defineProps<{
    modelValue: TcOverrides;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: TcOverrides): void;
}>();

const showPromptDialog = ref(false);
const showSkillDialog = ref(false);
const localSystemPrompt = ref('');
const localSkillName = ref('');
const skills = ref<SkillMetadata[]>([]);

const currentPromptContent = computed(() => {
    if (!localSystemPrompt.value) return '';
    return getSystemPrompt(localSystemPrompt.value) || '';
});

function confirmPrompt() {
    emit('update:modelValue', {
        ...props.modelValue,
        systemPrompt: localSystemPrompt.value || undefined
    });
    showPromptDialog.value = false;
}

function confirmSkill() {
    emit('update:modelValue', {
        ...props.modelValue,
        skillName: localSkillName.value || undefined
    });
    showSkillDialog.value = false;
}

watch(() => props.modelValue, (v) => {
    localSystemPrompt.value = v.systemPrompt || '';
    localSkillName.value = v.skillName || '';
}, { immediate: true });

watch(showPromptDialog, (v) => {
    if (v) localSystemPrompt.value = props.modelValue.systemPrompt || '';
});

watch(showSkillDialog, async (v) => {
    if (v) {
        localSkillName.value = props.modelValue.skillName || '';
        skills.value = await listSkills();
    }
});

onMounted(async () => {
    await loadSystemPrompts();
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

.setting-button.active {
    border-color: var(--main-light-color-90);
    background-color: var(--main-light-color-40);
}

.setting-button.active .iconfont,
.setting-button.active .skill-label {
    color: var(--el-color-primary);
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
</style>
