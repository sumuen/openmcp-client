<template>
    <div class="batch-validation-container">
        <div class="batch-validation-header">
            <h2>
                <span class="iconfont icon-dui"></span>
                {{ t('batch-validation') }}
            </h2>
            <p class="subtitle">{{ t('batch-validation-subtitle-new') }}</p>
        </div>

        <div class="batch-validation-content">
            <el-scrollbar class="config-panel-scroll">
            <div class="config-panel">
                <el-card class="config-card">
                    <template #header>
                        <span>{{ t('batch-validation-source') }}</span>
                    </template>
                    <el-select
                        v-model="selectedTabIndex"
                        :placeholder="t('batch-validation-select-chat-tab')"
                        style="width: 100%"
                    >
                        <el-option
                            v-for="(item, idx) in chatTabs"
                            :key="item.tab.id"
                            :label="getTabLabel(item.tab, idx)"
                            :value="idx"
                        />
                    </el-select>
                    <div class="source-hint">{{ t('batch-validation-source-hint') }}</div>
                </el-card>

                <el-card class="config-card">
                    <template #header>
                        <div class="card-header-row">
                            <span>{{ t('batch-validation-test-cases') }}</span>
                            <el-button size="small" type="primary" @click="addTestCase">
                                <span class="iconfont icon-add"></span>
                                {{ t('add') }}
                            </el-button>
                        </div>
                    </template>
                    <div class="test-cases-list">
                        <div
                            v-for="(tc, tcIdx) in testCases"
                            :key="tc.id"
                            class="test-case-group"
                        >
                            <div class="tc-group-header">
                                <span class="tc-group-title">{{ t('batch-validation-test-sample') }} #{{ tcIdx + 1 }}</span>
                                <el-button
                                    type="danger"
                                    size="small"
                                    text
                                    @click="removeTestCase(tcIdx)"
                                >
                                    <span class="iconfont icon-delete"></span>
                                    {{ t('delete') }}
                                </el-button>
                            </div>
                            <div class="tc-input-row">
                                <label>{{ t('batch-validation-test-input') }}</label>
                                <BatchValidationInput
                                    :ref="el => setTcInputRef(tc.id, el)"
                                    v-model="tc.input"
                                    :source-storage="sourceStorage"
                                    :placeholder="t('batch-validation-test-input-placeholder')"
                                />
                            </div>
                            <div class="tc-criteria-row">
                                <label>{{ t('batch-validation-criteria-list') }}</label>
                                <div
                                    v-for="(c, cIdx) in tc.criteria"
                                    :key="`${tc.id}-criteria-${cIdx}`"
                                    class="criterion-item"
                                >
                                    <el-input
                                        v-model="tc.criteria[cIdx]"
                                        type="textarea"
                                        :rows="1"
                                        :placeholder="t('batch-validation-criterion-placeholder')"
                                        size="small"
                                    />
                                    <el-button
                                        type="danger"
                                        size="small"
                                        text
                                        :disabled="tc.criteria.length <= 1"
                                        @click="removeCriterion(tcIdx, cIdx)"
                                    >
                                        <span class="iconfont icon-delete"></span>
                                    </el-button>
                                </div>
                                <el-button size="small" @click="addCriterion(tcIdx)" class="add-criterion-btn">
                                    <span class="iconfont icon-add"></span>
                                    {{ t('batch-validation-add-criterion') }}
                                </el-button>
                            </div>
                        </div>
                        <div v-if="testCases.length === 0" class="empty-hint">
                            {{ t('batch-validation-no-test-cases') }}
                        </div>
                    </div>
                </el-card>
            </div>
            </el-scrollbar>

            <div class="result-panel">
                <el-card class="run-card">
                    <div class="run-options">
                        <span class="run-options-label">{{ t('batch-validation-result-type') }}：</span>
                        <el-radio-group v-model="evaluationMode" size="small">
                            <el-radio label="pass-fail">{{ t('batch-validation-mode-pass-fail') }}</el-radio>
                            <el-radio label="score">{{ t('batch-validation-mode-score') }}</el-radio>
                        </el-radio-group>
                    </div>
                    <el-button
                        type="primary"
                        size="large"
                        :loading="isRunning"
                        :disabled="!canRun"
                        @click="runValidation"
                    >
                        <span v-if="!isRunning" class="iconfont icon-play"></span>
                        {{ t('batch-validation-run') }}
                    </el-button>
                    <div v-if="isRunning" class="run-status">{{ runStatusText }}</div>
                    <div v-if="!canRun && runDisabledReason" class="disabled-reason">
                        {{ runDisabledReason }}
                    </div>
                </el-card>

                <el-card v-if="results.length > 0" class="results-card">
                    <template #header>
                        <span>{{ t('batch-validation-results') }}</span>
                    </template>
                    <div class="results-list">
                        <div
                            v-for="(r, idx) in results"
                            :key="`${r.testCaseId}-${r.criterionIndex}`"
                            class="result-item"
                            :class="{ error: r.error }"
                        >
                            <div class="result-header">
                                <span class="result-index">#{{ r.testCaseIndex + 1 }}-{{ r.criterionIndex + 1 }}</span>
                                <span
                                    v-if="evaluationMode === 'pass-fail'"
                                    class="result-badge"
                                    :class="r.pass === true ? 'pass' : r.pass === false ? 'fail' : 'unknown'"
                                >
                                    {{ r.pass === true ? t('batch-validation-pass') : r.pass === false ? t('batch-validation-fail') : '?' }}
                                </span>
                                <span v-else class="result-score">
                                    {{ r.score !== undefined ? `${r.score}/10` : '-' }}
                                </span>
                            </div>
                            <div class="result-input" v-if="r.testInput">{{ r.testInput }}</div>
                            <div class="result-criteria">{{ r.testCaseCriteria }}</div>
                            <div v-if="r.error" class="result-error">{{ r.error }}</div>
                            <div v-else class="result-raw">{{ r.rawResponse }}</div>
                        </div>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessageBridge } from '@/api/message-bridge';
import { tabs } from '../panel';
import { llms, llmManager } from '@/views/setting/llm';
import { ElMessage } from 'element-plus';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, ChatStorage } from '../chat/chat-box/chat';
import { TaskLoop } from '../chat/core/task-loop';
import { mcpClientAdapter } from '@/views/connect/core';
import BatchValidationInput from './batch-validation-input.vue';

const { t } = useI18n();
defineProps({
    tabId: { type: Number, required: true }
});

interface TestCase {
    id: string;
    input: string;
    criteria: string[];
}

const tcInputRefs = new Map<string, InstanceType<typeof BatchValidationInput>>();

function setTcInputRef(tcId: string, el: any) {
    if (el) tcInputRefs.set(tcId, el);
    else tcInputRefs.delete(tcId);
}

interface ValidationResult {
    testCaseId: string;
    testCaseIndex: number;
    criterionIndex: number;
    testInput: string;
    testCaseCriteria: string;
    rawResponse: string;
    pass?: boolean;
    score?: number;
    error?: string;
}

const selectedTabIndex = ref<number>(0);
const evaluationMode = ref<'pass-fail' | 'score'>('pass-fail');
const testCases = ref<TestCase[]>([]);
const isRunning = ref(false);
const runStatusText = ref('');
const results = ref<ValidationResult[]>([]);

const chatTabs = computed(() => {
    return tabs.content
        .map((tab, idx) => ({ tab, originalIndex: idx }))
        .filter(({ tab }) => tab.componentIndex === 3);
});

const sourceStorage = computed((): ChatStorage | null => {
    const item = chatTabs.value[selectedTabIndex.value];
    if (!item) return null;
    return item.tab.storage as ChatStorage;
});

function getTabLabel(tab: { name: string; icon: string }, idx: number) {
    const name = typeof tab.name === 'string' ? tab.name : (tab.name as any)?.value ?? '';
    return `${name || t('chat-tab')} #${idx + 1}`;
}

const canRun = computed(() => {
    return (
        sourceStorage.value != null &&
        testCases.value.length > 0 &&
        testCases.value.some((tc) => tc.input.trim() && tc.criteria.some((c) => c.trim())) &&
        llms.length > 0 &&
        mcpClientAdapter.connected
    );
});

const runDisabledReason = computed(() => {
    if (!mcpClientAdapter.connected) return t('batch-validation-not-connected');
    if (!sourceStorage.value) return t('batch-validation-no-source');
    if (testCases.value.length === 0) return t('batch-validation-no-test-cases');
    if (!testCases.value.some((tc) => tc.input.trim() && tc.criteria.some((c) => c.trim()))) return t('batch-validation-invalid-cases');
    if (llms.length === 0) return t('batch-validation-no-llm');
    return '';
});

function addTestCase() {
    testCases.value.push({
        id: uuidv4(),
        input: '',
        criteria: ['']
    });
}

function removeTestCase(index: number) {
    testCases.value.splice(index, 1);
}

function addCriterion(tcIndex: number) {
    testCases.value[tcIndex].criteria.push('');
}

function removeCriterion(tcIndex: number, cIndex: number) {
    testCases.value[tcIndex].criteria.splice(cIndex, 1);
}

function messagesToTrace(messages: ChatMessage[]): Array<{ role: string; content: string }> {
    return messages.map((m) => {
        if (m.role === 'tool') {
            const content = Array.isArray(m.content)
                ? JSON.stringify(m.content)
                : String(m.content ?? '');
            return { role: 'tool', content };
        }
        const content = typeof m.content === 'string' ? m.content : String(m.content ?? '');
        return { role: m.role, content };
    });
}

async function runValidation() {
    if (!canRun.value || !sourceStorage.value) return;

    const llm = llms[llmManager.currentModelIndex] ?? llms[0];
    if (!llm) {
        ElMessage.error(t('batch-validation-no-llm'));
        return;
    }

    isRunning.value = true;
    results.value = [];
    const bridge = useMessageBridge();

    const llmConfig = {
        baseURL: llm.baseUrl || 'https://api.openai.com/v1',
        apiKey: llm.userToken || '',
        model: llm.userModel || llm.models?.[0] || '',
        temperature: 0
    };

    try {
        const validCases = testCases.value.filter(
            (tc) => tc.input.trim() && tc.criteria.filter((c) => c.trim()).length > 0
        );
        if (validCases.length === 0) {
            ElMessage.warning(t('batch-validation-invalid-cases'));
            return;
        }

        const allResults: ValidationResult[] = [];

        for (let tcIdx = 0; tcIdx < validCases.length; tcIdx++) {
            const tc = validCases[tcIdx];
            const input = tc.input.trim();
            const criteria = tc.criteria.filter((c) => c.trim());

            runStatusText.value = t('batch-validation-status-agent', { index: tcIdx + 1, total: validCases.length });

            const inputRef = tcInputRefs.get(tc.id);
            let storage: ChatStorage = inputRef?.virtualStorage
                ? JSON.parse(JSON.stringify({
                    ...(inputRef.virtualStorage as any).value,
                    id: uuidv4(),
                    messages: []
                }))
                : JSON.parse(JSON.stringify({
                    ...sourceStorage.value!,
                    id: uuidv4(),
                    messages: []
                }));
            const slashParsed = inputRef?.parseSlashCommand?.(input);
            if (slashParsed?.skillName) {
                (storage as any)._skillOverrideForNextMessage = slashParsed.skillName;
            }

            const loop = new TaskLoop({ maxEpochs: storage.settings?.contextLength || 50, verbose: 0 });
            const dummyContent = ref('');
            const dummyToolCalls = ref<any[]>([]);
            loop.bindStreaming(dummyContent, dummyToolCalls);

            loop.registerOnError((err) => {
                console.error('[BatchValidation] Agent error:', err);
            });

            const actualInput = slashParsed?.actualMessage !== undefined ? slashParsed.actualMessage || input : input;
            await loop.start(storage, actualInput, { mode: 'batch-validation' });

            const trace = messagesToTrace(storage.messages);
            if (trace.length === 0) {
                allResults.push({
                    testCaseId: tc.id,
                    testCaseIndex: tcIdx,
                    criterionIndex: 0,
                    testInput: input,
                    testCaseCriteria: criteria[0] || '',
                    rawResponse: '',
                    error: t('batch-validation-empty-trace')
                });
                continue;
            }

            runStatusText.value = t('batch-validation-status-eval', { index: tcIdx + 1, total: validCases.length });

            const testCasesForApi = criteria.map((c, i) => ({
                id: `${tc.id}-c-${i}`,
                expectedCriteria: c
            }));

            const { code, msg } = await bridge.commandRequest(
                'batch-validation/run',
                {
                    messages: trace,
                    testCases: testCasesForApi,
                    evaluationMode: evaluationMode.value,
                    llmConfig
                }
            );

            if (code === 200 && msg?.results) {
                const apiResults = msg.results as Array<{
                    testCaseId: string;
                    testCaseCriteria: string;
                    rawResponse: string;
                    pass?: boolean;
                    score?: number;
                    error?: string;
                }>;
                apiResults.forEach((r, cIdx) => {
                    allResults.push({
                        testCaseId: r.testCaseId,
                        testCaseIndex: tcIdx,
                        criterionIndex: cIdx,
                        testInput: input,
                        testCaseCriteria: r.testCaseCriteria,
                        rawResponse: r.rawResponse,
                        pass: r.pass,
                        score: r.score,
                        error: r.error
                    });
                });
            } else {
                criteria.forEach((c, cIdx) => {
                    allResults.push({
                        testCaseId: tc.id,
                        testCaseIndex: tcIdx,
                        criterionIndex: cIdx,
                        testInput: input,
                        testCaseCriteria: c,
                        rawResponse: '',
                        error: String(msg ?? 'Validation failed')
                    });
                });
            }
        }

        results.value = allResults;
        runStatusText.value = '';
        ElMessage.success(t('batch-validation-done'));
    } catch (err) {
        ElMessage.error(String(err));
        runStatusText.value = '';
    } finally {
        isRunning.value = false;
    }
}

watch(chatTabs, (val) => {
    if (val.length > 0 && selectedTabIndex.value >= val.length) selectedTabIndex.value = 0;
}, { immediate: true });
</script>

<style scoped>
.batch-validation-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px;
}

.batch-validation-header { margin-bottom: 20px; }

.batch-validation-header h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 20px;
}

.batch-validation-header .iconfont {
    font-size: 24px;
    color: var(--main-color);
}

.subtitle { margin: 8px 0 0 0; font-size: 13px; color: var(--sidebar-item-text); }

.batch-validation-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    min-height: 0;
    overflow: hidden;
}

.config-panel-scroll {
    min-height: 0;
}

.config-panel-scroll :deep(.el-scrollbar__wrap) {
    overflow-x: hidden;
}

.config-panel-scroll {
    height: 100%;
}

.config-panel, .result-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.config-panel {
    overflow: visible;
}

.result-panel {
    overflow: auto;
}

.config-card { flex-shrink: 0; }

.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.source-hint { margin-top: 8px; font-size: 12px; color: var(--sidebar-item-text); }

.run-options {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.run-options-label { font-size: 13px; color: var(--sidebar-item-text); }

.test-cases-list { display: flex; flex-direction: column; gap: 16px; }

.test-case-group {
    padding: 12px;
    border: 1px solid var(--sidebar-border);
    border-radius: 8px;
    background: var(--sidebar);
}

.tc-group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--sidebar-border);
}

.tc-group-title {
    font-weight: 600;
    font-size: 14px;
}

.tc-input-row, .tc-criteria-row {
    margin-bottom: 10px;
}

.tc-input-row label, .tc-criteria-row label {
    display: block;
    font-size: 12px;
    margin-bottom: 4px;
    color: var(--sidebar-item-text);
}

.tc-input-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.add-criterion-btn { margin-top: 4px; }

.criterion-item {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-bottom: 6px;
}

.criterion-item .el-input { flex: 1; }

.empty-hint { font-size: 13px; color: var(--sidebar-item-text); }

.run-card { flex-shrink: 0; }

.run-status { margin-top: 8px; font-size: 13px; color: var(--main-color); }

.disabled-reason { margin-top: 8px; font-size: 12px; color: var(--sidebar-item-text); }

.results-card { flex: 1; min-height: 0; }

.results-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 450px;
    overflow-y: auto;
}

.result-item {
    padding: 12px;
    border-radius: 8px;
    background: var(--sidebar);
    border: 1px solid var(--sidebar-border);
}

.result-item.error { border-color: var(--el-color-danger); }

.result-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }

.result-index { font-weight: 600; }

.result-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.result-badge.pass { background: var(--el-color-success-light-9); color: var(--el-color-success); }
.result-badge.fail { background: var(--el-color-danger-light-9); color: var(--el-color-danger); }
.result-badge.unknown { background: var(--el-color-info-light-9); color: var(--el-color-info); }

.result-score { font-weight: 600; }

.result-input { font-size: 12px; margin-bottom: 4px; color: var(--main-color); white-space: pre-wrap; }

.result-criteria { font-size: 13px; margin-bottom: 4px; color: var(--sidebar-item-text); }

.result-error { font-size: 12px; color: var(--el-color-danger); }

.result-raw { font-size: 12px; color: var(--foreground); white-space: pre-wrap; }
</style>
