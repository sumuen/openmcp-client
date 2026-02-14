<template>
    <div class="batch-validation-container">
        <div class="batch-list-panel">
            <div class="list-header">
                <el-button type="primary" @click="addTestCaseFromList">
                    <span class="iconfont icon-add"></span>
                    {{ t('add') }}
                </el-button>
            </div>
            <div class="list-container">
                <el-scrollbar>
                    <div class="list-inner">
                        <div v-for="item in listItems" :key="item.tabIndex" class="list-item"
                            :class="{ active: selectedTabIndex === item.tabIndex }"
                            @click="selectTestCase(item.tabIndex)">
                            <div class="item-title">
                                {{ getListItemTitle(item.tabIndex) }}
                            </div>
                            <div v-if="getListItemPreview(item.tabIndex)" class="item-preview">
                                {{ getListItemPreview(item.tabIndex) }}
                            </div>
                            <div v-else class="item-empty">-</div>
                        </div>
                        <div v-if="listItems.length === 0" class="list-empty">
                            {{ t('batch-validation-no-chat-tabs') }}
                        </div>
                    </div>
                </el-scrollbar>
            </div>
        </div>
        <div class="batch-detail-panel">
            <el-scrollbar>
                <div v-if="listItems.length === 0" class="no-selection">
                    <el-empty :description="t('batch-validation-no-chat-tabs')" />
                </div>
                <div v-else-if="formModel" class="detail-content">
                    <div class="detail-section detail-actions-top">
                        <div class="detail-actions-row">
                            <el-input v-model="formModel.name" :placeholder="defaultTestCaseName" class="detail-name-input" />
                            <el-button
                                type="default"
                                :title="t('batch-validation-settings-drawer-title')"
                                circle
                                @click="settingsDrawerVisible = true"
                            >
                                <span class="iconfont icon-setting"></span>
                            </el-button>
                            <el-button type="primary" :loading="isRunning" :disabled="!canRun"
                                @click="runValidation">
                                <span v-if="!isRunning" class="iconfont icon-play"></span>
                                {{ t('batch-validation-run') }}
                            </el-button>
                        </div>
                        <div v-if="runStatusText" class="detail-status">{{ runStatusText }}</div>
                        <div v-if="!canRun && runDisabledReason" class="detail-hint">{{ runDisabledReason }}</div>
                    </div>
                    <div class="detail-section">
                        <label class="detail-section-label">{{ t('batch-validation-test-input') }}</label>
                        <BatchValidationInput :ref="el => setTcInputRef(formModel.id, el)" v-model="formModel.input"
                            :source-storage="sourceStorage"
                            :placeholder="t('batch-validation-test-input-placeholder')" />
                    </div>
                    <div class="detail-section">
                        <label class="detail-section-label">{{ t('batch-validation-criteria-list') }}</label>
                        <div v-for="(c, cIdx) in formModel.criteria" :key="`${formModel.id}-criteria-${cIdx}`"
                            class="criterion-item">
                            <el-input v-model="formModel.criteria[cIdx]" type="textarea" :rows="2"
                                :placeholder="t('batch-validation-criterion-placeholder')" />
                            <el-button type="danger" text :disabled="formModel.criteria.length <= 1"
                                @click="removeCriterion(cIdx)">
                                <span class="iconfont icon-delete"></span>
                            </el-button>
                        </div>
                        <el-button @click="addCriterion" class="add-criterion-btn">
                            <span class="iconfont icon-add"></span>
                            {{ t('batch-validation-add-criterion') }}
                        </el-button>
                    </div>
                    <div v-if="currentResultItems.length > 0" class="detail-results">
                        <h4>{{ t('batch-validation-results') }}</h4>
                        <div class="results-list">
                            <div v-for="(r, idx) in currentResultItems" :key="`${r.testCaseId}-${r.criterionIndex}`"
                                class="result-item" :class="{ error: r.error }">
                                <div class="result-header">
                                    <span class="result-index">#{{ r.testCaseIndex + 1 }}-{{ r.criterionIndex + 1
                                        }}</span>
                                    <span v-if="evaluationMode === 'pass-fail'" class="result-badge"
                                        :class="r.pass === true ? 'pass' : r.pass === false ? 'fail' : 'unknown'">
                                        {{ r.pass === true ? t('batch-validation-pass') : r.pass === false ?
                                        t('batch-validation-fail') : '?' }}
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
                    </div>
                </div>
                <div v-else class="no-selection">
                    <el-empty />
                </div>
            </el-scrollbar>
            <!-- 从右往左拉出的配置抽屉：当前测试样例的 pass/score、描述等 -->
            <Teleport to="body">
                <Transition name="settings-drawer">
                    <div
                        v-if="settingsDrawerVisible && formModel"
                        class="settings-drawer-mask"
                        @click.self="settingsDrawerVisible = false"
                    >
                        <div class="settings-drawer-panel">
                            <div class="settings-drawer-header">
                                <span class="settings-drawer-title">{{ t('batch-validation-settings-drawer-title') }}</span>
                                <el-button type="primary" text circle @click="settingsDrawerVisible = false">
                                    <span class="iconfont icon-close"></span>
                                </el-button>
                            </div>
                            <div class="settings-drawer-body">
                                <div class="settings-drawer-section">
                                    <label class="detail-section-label">{{ t('batch-validation-evaluation-mode') }}</label>
                                    <el-radio-group v-model="evaluationMode" class="settings-drawer-radio">
                                        <el-radio-button label="pass-fail">{{ t('batch-validation-mode-pass-fail') }}</el-radio-button>
                                        <el-radio-button label="score">{{ t('batch-validation-mode-score') }}</el-radio-button>
                                    </el-radio-group>
                                </div>
                                <div class="settings-drawer-section">
                                    <label class="detail-section-label">{{ t('batch-validation-test-case-desc') }}</label>
                                    <el-input
                                        v-model="formModel.description"
                                        type="textarea"
                                        :rows="4"
                                        :placeholder="t('batch-validation-test-case-desc-placeholder')"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Transition>
            </Teleport>
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
    name?: string;
    description?: string;
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
/** 每个交互测试标签页对应一个测试案例 */
const testCasesByTabIndex = ref<Record<number, TestCase>>({});
const isRunning = ref(false);
const runStatusText = ref('');
const results = ref<ValidationResult[]>([]);
/** 从右往左拉出的配置抽屉（pass/score、描述等） */
const settingsDrawerVisible = ref(false);

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
    return `${name || t('batch-validation-default-case-name')} #${idx + 1}`;
}

/** 当前测试用例的默认名称（与左侧列表一致：交互测试 #1） */
const defaultTestCaseName = computed(() => {
    const tabItem = chatTabs.value[selectedTabIndex.value];
    return tabItem ? getTabLabel(tabItem.tab, selectedTabIndex.value) : '';
});

/** 列表项标题：优先显示测试用例名称，否则显示标签页名（含草稿，用于 Vue 响应式追踪） */
function getListItemTitle(tabIndex: number) {
    const tc = testCasesByTabIndex.value[tabIndex] ?? (tabIndex === selectedTabIndex.value ? draftTestCase.value : null);
    const tabItem = chatTabs.value[tabIndex];
    if (tc?.name?.trim()) return tc.name;
    return tabItem ? getTabLabel(tabItem.tab, tabIndex) : '';
}

/** 列表项预览：描述或输入摘要（含草稿，用于 Vue 响应式追踪） */
function getListItemPreview(tabIndex: number) {
    const tc = testCasesByTabIndex.value[tabIndex] ?? (tabIndex === selectedTabIndex.value ? draftTestCase.value : null);
    if (!tc) return '';
    if (tc.description?.trim()) return tc.description;
    if (tc.input?.trim()) return tc.input.substring(0, 40) + (tc.input.length > 40 ? '...' : '');
    return '';
}

/** 当前选中标签页对应的测试案例（已持久化） */
const currentTestCase = computed(() => {
    return testCasesByTabIndex.value[selectedTabIndex.value] ?? null;
});

/** 当前表单数据：持久化的测试案例 或 未保存的草稿（选中无表单的标签页时） */
const formModel = computed(() => {
    return currentTestCase.value ?? draftTestCase.value;
});

/** 未保存的草稿（当选中标签页尚无测试案例时使用） */
const draftTestCase = ref<TestCase | null>(null);

function createEmptyTestCase(): TestCase {
    return { id: uuidv4(), name: '', description: '', input: '', criteria: [''] };
}

/** 将草稿持久化到指定标签页 */
function commitDraftToTab(tabIndex: number) {
    const draft = draftTestCase.value;
    if (draft) {
        testCasesByTabIndex.value = {
            ...testCasesByTabIndex.value,
            [tabIndex]: { ...draft }
        };
        draftTestCase.value = null;
    }
}

watch(selectedTabIndex, (newIdx, oldIdx) => {
    if (oldIdx !== undefined && draftTestCase.value) {
        commitDraftToTab(oldIdx);
    }
    if (chatTabs.value[newIdx] && !testCasesByTabIndex.value[newIdx]) {
        draftTestCase.value = createEmptyTestCase();
    } else {
        draftTestCase.value = null;
    }
}, { immediate: true });

/** 当前表单对应测试案例的验证结果 */
const currentResultItems = computed(() => {
    const tc = formModel.value;
    if (!tc) return [];
    return results.value.filter((r) => r.testCaseId === tc.id);
});

const validTestCases = computed(() => {
    const cases: Array<{ tabIndex: number; tc: TestCase }> = [];
    Object.entries(testCasesByTabIndex.value).forEach(([tabIdxStr, tc]) => {
        const tabIndex = Number(tabIdxStr);
        if (tc.input.trim() && tc.criteria.some((c) => c.trim())) {
            cases.push({ tabIndex, tc });
        }
    });
    cases.sort((a, b) => a.tabIndex - b.tabIndex);
    return cases;
});

const canRun = computed(() => {
    return (
        validTestCases.value.length > 0 &&
        llms.length > 0 &&
        mcpClientAdapter.connected
    );
});

const runDisabledReason = computed(() => {
    if (!mcpClientAdapter.connected) return t('batch-validation-not-connected');
    if (validTestCases.value.length === 0) return '';
    if (llms.length === 0) return t('batch-validation-no-llm');
    return '';
});

function addTestCaseForCurrentTab() {
    const idx = selectedTabIndex.value;
    testCasesByTabIndex.value = {
        ...testCasesByTabIndex.value,
        [idx]: { id: uuidv4(), input: '', criteria: [''] }
    };
}

/** 左侧列表数据：所有交互测试标签页（含无测试案例的） */
const listItems = computed(() => {
    return chatTabs.value.map((item, idx) => ({
        tabIndex: idx,
        tab: item.tab,
        tc: testCasesByTabIndex.value[idx] ?? null
    }));
});

function selectTestCase(tabIndex: number) {
    if (tabIndex === selectedTabIndex.value) return;
    if (draftTestCase.value) {
        commitDraftToTab(selectedTabIndex.value);
    }
    selectedTabIndex.value = tabIndex;
}

/** 从列表头添加：保存当前表单（含草稿），为第一个无测试案例的标签页创建新表单并切换 */
function addTestCaseFromList() {
    const current = selectedTabIndex.value;
    if (draftTestCase.value) {
        commitDraftToTab(current);
    }
    const target = chatTabs.value.findIndex((_, i) => !testCasesByTabIndex.value[i]);
    const nextIdx = target >= 0 ? target : 0;
    testCasesByTabIndex.value = {
        ...testCasesByTabIndex.value,
        [nextIdx]: createEmptyTestCase()
    };
    selectedTabIndex.value = nextIdx;
}

function removeCurrentTestCase() {
    const idx = selectedTabIndex.value;
    const next = { ...testCasesByTabIndex.value };
    delete next[idx];
    testCasesByTabIndex.value = next;
}

function addCriterion() {
    const tc = formModel.value;
    if (tc) tc.criteria.push('');
}

function removeCriterion(cIndex: number) {
    const tc = formModel.value;
    if (tc && tc.criteria.length > 1) tc.criteria.splice(cIndex, 1);
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
    if (draftTestCase.value) {
        commitDraftToTab(selectedTabIndex.value);
    }
    if (!canRun.value) return;

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

    const casesToRun = validTestCases.value;
    if (casesToRun.length === 0) {
        ElMessage.warning(t('batch-validation-invalid-cases'));
        isRunning.value = false;
        return;
    }

    try {
        const allResults: ValidationResult[] = [];

        for (let i = 0; i < casesToRun.length; i++) {
            const { tabIndex, tc } = casesToRun[i];
            const tabItem = chatTabs.value[tabIndex];
            if (!tabItem) continue;
            const tabStorage = tabItem.tab.storage as ChatStorage;
            const input = tc.input.trim();
            const criteria = tc.criteria.filter((c) => c.trim());

            runStatusText.value = t('batch-validation-status-agent', { index: i + 1, total: casesToRun.length });

            const inputRef = tcInputRefs.get(tc.id);
            let storage: ChatStorage = inputRef?.virtualStorage
                ? JSON.parse(JSON.stringify({
                    ...(inputRef.virtualStorage as any).value,
                    id: uuidv4(),
                    messages: []
                }))
                : JSON.parse(JSON.stringify({
                    ...tabStorage,
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
                    testCaseIndex: i,
                    criterionIndex: 0,
                    testInput: input,
                    testCaseCriteria: criteria[0] || '',
                    rawResponse: '',
                    error: t('batch-validation-empty-trace')
                });
                continue;
            }

            runStatusText.value = t('batch-validation-status-eval', { index: i + 1, total: casesToRun.length });

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
                        testCaseIndex: i,
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
                        testCaseIndex: i,
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
/* 仿 reflux：全屏布局，无 padding，无 max-width */
.batch-validation-container {
    display: flex;
    height: 100%;
}

/* 左侧列表 */
.batch-list-panel {
    width: 300px;
    border-right: 1px solid var(--el-border-color-light);
    background-color: var(--el-bg-color);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

.batch-list-panel .list-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color-light);
}

.batch-list-panel .list-container {
    flex: 1;
    min-height: 0;
}

.batch-list-panel .list-container .el-scrollbar {
    height: 100%;
}

.batch-list-panel .list-inner {
    padding: 10px;
}

.batch-list-panel .list-item {
    margin: 3px;
    padding: 5px 10px;
    border-radius: 0.3em;
    user-select: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    transition: var(--animation-3s);
}

.batch-list-panel .list-item:hover {
    background-color: var(--el-fill-color-light);
}

.batch-list-panel .list-item:active {
    transform: scale(0.95);
}

.batch-list-panel .list-item.active {
    background-color: var(--el-fill-color-light);
    border-left: 3px solid var(--el-color-primary-light-5);
}

.batch-list-panel .item-title {
    font-weight: bold;
    font-size: 13px;
    max-width: 250px;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.batch-list-panel .item-preview,
.batch-list-panel .item-empty {
    font-size: 12.5px;
    opacity: 0.6;
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.batch-list-panel .list-empty {
    padding: 10px;
    font-size: 12.5px;
    opacity: 0.6;
}

/* 右侧详情 */
.batch-detail-panel {
    flex: 1;
    min-width: 0;
    background-color: var(--el-bg-color);
}

.batch-detail-panel .detail-actions-top {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.batch-detail-panel .detail-actions-top .detail-actions-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.batch-detail-panel .detail-actions-top .detail-actions-row .detail-name-input {
    flex: 1;
    min-width: 0;
}

.batch-detail-panel .detail-actions-top .detail-actions-row .el-radio-group {
    flex-shrink: 0;
}

.batch-detail-panel .detail-actions-top .detail-actions-row .el-button {
    flex-shrink: 0;
}

.batch-detail-panel .detail-actions-top .iconfont {
    margin-right: 6px;
}

/* 从右往左拉出的配置抽屉 */
.settings-drawer-mask {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: flex-end;
}

.settings-drawer-panel {
    width: 360px;
    max-width: 100%;
    height: 100%;
    background: var(--el-bg-color);
    box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.settings-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-light);
    flex-shrink: 0;
}

.settings-drawer-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.settings-drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

.settings-drawer-section {
    margin-bottom: 20px;
}

.settings-drawer-section .detail-section-label {
    margin-bottom: 8px;
}

.settings-drawer-radio {
    display: flex;
    width: 100%;
}

.settings-drawer-radio .el-radio-button {
    flex: 1;
}

.settings-drawer-radio .el-radio-button__inner {
    width: 100%;
    text-align: center;
}

/* 抽屉从右往左滑入 */
.settings-drawer-enter-active .settings-drawer-panel,
.settings-drawer-leave-active .settings-drawer-panel {
    transition: transform 0.25s ease;
}

.settings-drawer-enter-from .settings-drawer-panel,
.settings-drawer-leave-to .settings-drawer-panel {
    transform: translateX(100%);
}

.settings-drawer-enter-active .settings-drawer-mask,
.settings-drawer-leave-active .settings-drawer-mask {
    transition: opacity 0.25s ease;
}

.settings-drawer-enter-from,
.settings-drawer-leave-to {
    opacity: 0;
}

.batch-detail-panel .detail-status {
    margin-top: 8px;
    font-size: 13px;
    color: var(--main-color);
}

.batch-detail-panel .detail-hint {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.batch-detail-panel .el-scrollbar {
    height: 100%;
}

.batch-detail-panel .no-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
    gap: 16px;
}

.batch-detail-panel .no-selection.add-prompt {
    flex-direction: column;
}

.batch-detail-panel .detail-content {
    padding: 20px;
}

.batch-detail-panel .detail-section {
    margin-bottom: 16px;
}

/* 描述、输入、评价标准等区块标题的独立样式 */
.batch-detail-panel .detail-section-label {
    display: block;
    font-size: 15px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    margin-bottom: 8px;
}

.batch-detail-panel .detail-score-type {
    font-size: 14px;
    color: var(--el-text-color-primary);
}

.batch-detail-panel .detail-results {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-light);
}

.batch-detail-panel .detail-results h4 {
    margin: 0 0 12px;
    font-size: 14px;
}


.result-panel {
    overflow: auto;
}


.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.test-cases-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.test-case-group {
    padding: 12px;
    border: 1px solid var(--sidebar-border);
    border-radius: 8px;
    background: var(--sidebar);
}

.tc-group-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--sidebar-border);
}

.tc-input-row,
.tc-criteria-row {
    margin-bottom: 10px;
}

.tc-input-row label,
.tc-criteria-row label {
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

.add-criterion-btn {
    margin-top: 4px;
}

.criterion-item {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-bottom: 6px;
}

.criterion-item .el-input {
    flex: 1;
}

.empty-hint {
    font-size: 13px;
    color: var(--sidebar-item-text);
}

.results-card {
    flex: 1;
    min-height: 0;
}

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

.result-item.error {
    border-color: var(--el-color-danger);
}

.result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
}

.result-index {
    font-weight: 600;
}

.result-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.result-badge.pass {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
}

.result-badge.fail {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
}

.result-badge.unknown {
    background: var(--el-color-info-light-9);
    color: var(--el-color-info);
}

.result-score {
    font-weight: 600;
}

.result-input {
    font-size: 12px;
    margin-bottom: 4px;
    color: var(--main-color);
    white-space: pre-wrap;
}

.result-criteria {
    font-size: 13px;
    margin-bottom: 4px;
    color: var(--sidebar-item-text);
}

.result-error {
    font-size: 12px;
    color: var(--el-color-danger);
}

.result-raw {
    font-size: 12px;
    color: var(--foreground);
    white-space: pre-wrap;
}
</style>
