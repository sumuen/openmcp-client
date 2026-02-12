<template>
    <div class="test-cases-container">
        <div class="test-cases-header">
            <h3>
                <span class="iconfont icon-tool"></span>
                {{ t('test-cases-management') }}
            </h3>
            <div class="header-actions">
                <el-switch
                    v-model="tabStorage.showOnlyCurrentToolTestCases"
                    :active-text="t('show-only-current-tool')"
                    style="margin-right: 10px;"
                />
                <el-button size="default" @click="handleCreateTestCase" class="btn-create">
                    <span class="iconfont icon-add"></span>
                    {{ t('create-test-case') }}
                </el-button>
                <el-button size="default" @click="handleRunAllTests" :loading="runningAll" class="btn-run-all">
                    <span class="iconfont icon-play"></span>
                    {{ t('run-all-tests') }}
                </el-button>
            </div>
        </div>

        <div class="test-cases-list">
            <el-scrollbar height="100%">
                <el-empty v-if="testCases.length === 0" :description="t('no-test-cases')" />
                <div v-else class="test-case-items">
                    <div v-for="testCase in testCases" :key="testCase.id" class="test-case-item"
                        :class="{ 'active': selectedTestCase?.id === testCase.id }">
                        <div class="test-case-header">
                            <div class="test-case-info">
                                <el-tag :type="getStatusTagType(testCase.status)" size="small" class="status-tag">
                                    {{ getStatusText(testCase.status) }}
                                </el-tag>
                                <span class="test-case-name">{{ testCase.name }}</span>
                                <span class="test-case-tool">{{ testCase.toolName }}</span>
                            </div>
                            <div class="test-case-actions">
                                <el-tooltip :content="t('run-test')" placement="top">
                                    <el-button type="primary" size="small" circle @click.stop="handleRunTest(testCase)"
                                        :loading="testCase.status === 'running'" class="btn-run">
                                        <span class="iconfont icon-play"></span>
                                    </el-button>
                                </el-tooltip>
                                <el-tooltip v-if="testCase.actualOutput" :content="t('view-result')" placement="top">
                                    <el-button size="small" circle @click.stop="selectTestCase(testCase)" class="btn-view">
                                        <span class="iconfont icon-wendang"></span>
                                    </el-button>
                                </el-tooltip>
                                <el-tooltip :content="t('edit-test-case')" placement="top">
                                    <el-button size="small" circle @click.stop="handleEditTestCase(testCase)"
                                        class="btn-edit">
                                        <span class="iconfont icon-edit"></span>
                                    </el-button>
                                </el-tooltip>
                                <el-popconfirm :title="t('confirm-delete-test-case')"
                                    @confirm="handleDeleteTestCase(testCase.id)">
                                    <template #reference>
                                        <el-tooltip :content="t('delete-test-case')" placement="top">
                                            <el-button type="danger" size="small" circle @click.stop class="btn-delete">
                                                <span class="iconfont icon-delete"></span>
                                            </el-button>
                                        </el-tooltip>
                                    </template>
                                </el-popconfirm>
                            </div>
                        </div>
                        <div class="test-case-description" v-if="testCase.description">
                            {{ testCase.description }}
                        </div>
                        <div class="test-case-time">
                            {{ t('updated-at') }}: {{ formatTime(testCase.updatedAt) }}
                        </div>
                    </div>
                </div>
            </el-scrollbar>
        </div>

        <!-- 测试用例详情/编辑对话框 -->
        <el-dialog v-model="dialogVisible" :title="isEditing ? t('edit-test-case') : t('create-test-case')" width="60%"
            :close-on-click-modal="false" class="test-case-dialog">
            <el-form :model="currentTestCaseForm" label-position="top" ref="formRef">
                <el-form-item :label="t('test-case-name')" required>
                    <el-input v-model="currentTestCaseForm.name" :placeholder="t('enter-test-case-name')" />
                </el-form-item>
                <el-form-item :label="t('tool-name')" required>
                    <el-select v-model="currentTestCaseForm.toolName" :placeholder="t('select-tool')"
                        @change="handleToolChange" style="width: 100%">
                        <el-option v-for="tool in availableTools" :key="tool.name" :label="tool.name"
                            :value="tool.name" />
                    </el-select>
                </el-form-item>
                <el-form-item :label="t('description')">
                    <el-input v-model="currentTestCaseForm.description" type="textarea" :rows="2"
                        :placeholder="t('enter-description')" />
                </el-form-item>
                <el-form-item :label="t('input-parameters')" required>
                    <div class="json-editor">
                        <el-input v-model="inputJson" type="textarea" :rows="8" :placeholder="t('enter-json-input')" />
                        <el-button size="small" @click="formatInputJson" class="btn-format"> {{ t('format-json') }}</el-button>
                        <el-button size="small" @click="copyFromCurrentForm" class="btn-copy">{{ t('copy-from-executor') }}</el-button>
                    </div>
                </el-form-item>
                <el-form-item :label="t('expected-output')">
                    <div class="json-editor">
                        <el-input v-model="expectedJson" type="textarea" :rows="8"
                            :placeholder="t('enter-json-input')" />
                        <el-button size="small" @click="formatExpectedJson" class="btn-format">{{ t('format-json') }}</el-button>
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false" class="btn-cancel">{{ t('cancel') }}</el-button>
                <el-button @click="handleSaveTestCase" class="btn-save">{{ t('save') }}</el-button>
            </template>
        </el-dialog>

        <!-- 测试结果详情对话框 -->
        <el-dialog v-model="resultDialogVisible" :title="t('test-result-details')" width="70%" class="test-result-dialog">
            <div v-if="selectedTestCase" class="test-result-container">
                <div class="result-section">
                    <h4>{{ t('input-parameters') }}</h4>
                    <pre class="json-display">{{ JSON.stringify(selectedTestCase.input, null, 2) }}</pre>
                </div>
                <div class="result-section">
                    <h4>{{ t('actual-output') }}</h4>
                    <pre class="json-display">{{ JSON.stringify(selectedTestCase.actualOutput, null, 2) }}</pre>
                </div>
                <div class="result-section">
                    <h4>{{ t('expected-output') }}</h4>
                    <pre class="json-display">{{ JSON.stringify(selectedTestCase.expectedOutput, null, 2) }}</pre>
                </div>
            </div>
            <template #footer>
                <el-button @click="resultDialogVisible = false" class="btn-close">{{ t('close') }}</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance } from 'element-plus';
import { tabs } from '../../../panel';
import type { ToolStorage, TestCase } from '../../tools';
import { mcpClientAdapter } from '@/views/connect/core';
import { initTestCasesStore, testCasesState, saveTestCases } from './store';

const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as ToolStorage;

// 初始化 server 级测试用例存储
try { initTestCasesStore(mcpClientAdapter.masterNode); } catch { /* 已初始化忽略 */ }

const testCases = computed(() => {
    const list = testCasesState.value || [];
    const onlyCurrent = !!tabStorage.showOnlyCurrentToolTestCases;
    const current = tabStorage.currentToolName;
    if (onlyCurrent && current) {
        return list.filter(tc => tc.toolName === current);
    }
    return list;
});
const selectedTestCase = ref<TestCase | null>(null);
const dialogVisible = ref(false);
const resultDialogVisible = ref(false);
const isEditing = ref(false);
const runningAll = ref(false);
const formRef = ref<FormInstance>();

interface TestCaseForm {
    name: string;
    toolName: string;
    description?: string;
    input: Record<string, any>;
}

const currentTestCaseForm = ref<TestCaseForm>({
    name: '',
    toolName: '',
    description: '',
    input: {}
});

const inputJson = ref('{}');
const expectedJson = ref('');

// 获取所有可用的工具
const availableTools = computed(() => {
    const tools: Array<{ name: string; description?: string }> = [];
    for (const client of mcpClientAdapter.clients) {
        if (client.tools) {
            for (const tool of client.tools.values()) {
                tools.push({
                    name: tool.name,
                    description: tool.description
                });
            }
        }
    }
    return tools;
});

function selectTestCase(testCase: TestCase) {
    selectedTestCase.value = testCase;
    resultDialogVisible.value = true;
}

function handleCreateTestCase() {
    isEditing.value = false;
    currentTestCaseForm.value = {
        name: '',
        toolName: tabStorage.currentToolName || '',
        description: '',
        input: {}
    };
    inputJson.value = '{}';
    expectedJson.value = '';
    dialogVisible.value = true;
}

function handleEditTestCase(testCase: TestCase) {
    isEditing.value = true;
    currentTestCaseForm.value = {
        name: testCase.name,
        toolName: testCase.toolName,
        description: testCase.description,
        input: { ...testCase.input }
    };
    inputJson.value = JSON.stringify(testCase.input, null, 2);
    expectedJson.value = testCase.expectedOutput ? JSON.stringify(testCase.expectedOutput, null, 2) : '';
    selectedTestCase.value = testCase;
    dialogVisible.value = true;
}

function handleToolChange() {
    // 工具变更时重置输入
    inputJson.value = '{}';
}

function formatInputJson() {
    try {
        const parsed = JSON.parse(inputJson.value);
        inputJson.value = JSON.stringify(parsed, null, 2);
        ElMessage.success(t('format-success'));
    } catch (e) {
        ElMessage.error(t('invalid-json'));
    }
}

function formatExpectedJson() {
    try {
        if (!expectedJson.value || expectedJson.value.trim() === '') {
            expectedJson.value = '';
            ElMessage.success(t('format-success'));
            return;
        }
        const parsed = JSON.parse(expectedJson.value);
        expectedJson.value = JSON.stringify(parsed, null, 2);
        ElMessage.success(t('format-success'));
    } catch (e) {
        ElMessage.error(t('invalid-json'));
    }
}

function copyFromCurrentForm() {
    try {
        inputJson.value = JSON.stringify(tabStorage.formData, null, 2);
        ElMessage.success(t('copied-from-executor'));
    } catch (e) {
        ElMessage.error(t('copy-failed'));
    }
}

function handleSaveTestCase() {
    // 验证
    if (!currentTestCaseForm.value.name) {
        ElMessage.error(t('please-enter-test-case-name'));
        return;
    }
    if (!currentTestCaseForm.value.toolName) {
        ElMessage.error(t('please-select-tool'));
        return;
    }

    // 解析输入 JSON
    let parsedInput: Record<string, any>;
    try {
        parsedInput = JSON.parse(inputJson.value);
    } catch (e) {
        ElMessage.error(t('invalid-input-json'));
        return;
    }

    // 解析预期输出 JSON（可选）
    let parsedExpected: any | undefined = undefined;
    if (expectedJson.value && expectedJson.value.trim() !== '') {
        try {
            parsedExpected = JSON.parse(expectedJson.value);
        } catch (e) {
            ElMessage.error(t('invalid-input-json'));
            return;
        }
    }

    const now = Date.now();

    if (isEditing.value && selectedTestCase.value) {
        // 编辑现有测试用例
        const index = testCasesState.value.findIndex(tc => tc.id === selectedTestCase.value!.id);
        if (index !== -1) {
            testCasesState.value[index] = {
                ...testCasesState.value[index],
                name: currentTestCaseForm.value.name,
                toolName: currentTestCaseForm.value.toolName,
                description: currentTestCaseForm.value.description,
                input: parsedInput,
                expectedOutput: parsedExpected,
                updatedAt: now
            };
        }
        saveTestCases();
        ElMessage.success(t('test-case-updated'));
    } else {
        // 创建新测试用例
        const newTestCase: TestCase = {
            id: `test_${now}_${Math.random().toString(36).substr(2, 9)}`,
            name: currentTestCaseForm.value.name,
            toolName: currentTestCaseForm.value.toolName,
            description: currentTestCaseForm.value.description,
            input: parsedInput,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
            ...(parsedExpected !== undefined ? { expectedOutput: parsedExpected } : {})
        };
        testCasesState.value.push(newTestCase);
        saveTestCases();
        ElMessage.success(t('test-case-created'));
    }

    dialogVisible.value = false;
}

function handleDeleteTestCase(id: string) {
    const index = testCasesState.value.findIndex(tc => tc.id === id);
    if (index !== -1) {
        testCasesState.value.splice(index, 1);
        saveTestCases();
        ElMessage.success(t('test-case-deleted'));
    }
}

async function handleRunTest(testCase: TestCase) {
    testCase.status = 'running';
    try {
        const response = await mcpClientAdapter.callTool(testCase.toolName, testCase.input);
        testCase.actualOutput = response;

        // 无预期输出时，工具调用成功即视为通过；有预期输出时进行比对
        const hasExpected = testCase.expectedOutput !== undefined && testCase.expectedOutput !== null;
        const isMatch = !hasExpected || JSON.stringify(response) === JSON.stringify(testCase.expectedOutput);
        testCase.status = isMatch ? 'passed' : 'failed';


        testCase.updatedAt = Date.now();
    // 持久化单次执行结果
    saveTestCases();
        ElMessage.success(t('test-executed-successfully'));

        // 单个执行时自动展示结果详情
        if (!runningAll.value) {
            selectedTestCase.value = testCase;
            resultDialogVisible.value = true;
        }
    } catch (e) {
        testCase.status = 'failed';
        testCase.actualOutput = {
            content: [{ type: 'text', text: `Error: ${e}` }],
            isError: true
        };
        ElMessage.error(t('test-execution-failed'));

        if (!runningAll.value) {
            selectedTestCase.value = testCase;
            resultDialogVisible.value = true;
        }
    }
}

async function handleRunAllTests() {
    runningAll.value = true;
    let passed = 0;
    let failed = 0;

    for (const testCase of testCasesState.value) {
        await handleRunTest(testCase);
        if (testCase.status === 'passed') {
            passed++;
        } else if (testCase.status === 'failed') {
            failed++;
        }
    }

    runningAll.value = false;
    // 批量执行后统一保存
    saveTestCases();
    ElMessage.success(`${t('all-tests-completed')}: ${passed} ${t('passed')}, ${failed} ${t('failed')}`);
}

function getStatusTagType(status?: string): '' | 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
        case 'passed': return 'success';
        case 'failed': return 'danger';
        case 'running': return 'warning';
        default: return 'info';
    }
}

function getStatusText(status?: string): string {
    switch (status) {
        case 'passed': return t('test-passed');
        case 'failed': return t('test-failed');
        case 'running': return t('test-running');
        default: return t('test-pending');
    }
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

</script>

<style scoped>
.test-cases-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    margin-top: 20px;
}

.test-cases-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--main-light-color);
}

.test-cases-header h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
}

.header-actions {
    display: flex;
    gap: 10px;
}

.header-actions .btn-create {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    border-radius: 8px;
}

.header-actions .btn-create:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.header-actions .btn-run-all {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    border-radius: 8px;
}

.header-actions .btn-run-all:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.test-cases-list {
    flex: 1;
    overflow: hidden;
}

.test-case-items {
    padding: 10px;
}

.test-case-item {
    background-color: var(--background);
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 15px;
    margin-bottom: 12px;
    transition: var(--animation-3s);
}

.test-case-item:hover {
    background-color: var(--main-light-color-20);
}

.test-case-item.active {
    border-color: var(--main-color);
    box-shadow: 0 0 0 2px var(--main-light-color-20);
    background-color: var(--main-light-color-10);
}

.test-case-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.test-case-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
}

.status-tag {
    flex-shrink: 0;
}

.test-case-name {
    font-weight: bold;
    font-size: 15px;
}

.test-case-tool {
    opacity: 0.7;
    font-size: 13px;
    background-color: var(--main-color);
    padding: 2px 8px;
    border-radius: 0.3em;
    color: black;
}

.test-case-actions {
    margin-left: 5px;
    display: flex;
    gap: 5px;
}

.test-case-actions .btn-edit {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
}

.test-case-actions .btn-edit:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.test-case-actions .btn-run {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
}

.test-case-actions .btn-run:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.test-case-actions .btn-view {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
}

.test-case-actions .btn-view:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.test-case-actions .btn-delete {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
}

.test-case-actions .btn-delete:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.test-case-description {
    opacity: 0.8;
    font-size: 13px;
    margin-bottom: 5px;
}

.test-case-time {
    opacity: 0.6;
    font-size: 12px;
}

.json-editor {
    width: 100%;
}

.json-editor .el-button {
    margin-top: 8px;
    margin-right: 8px;
}

.json-editor .btn-format {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    border-radius: 6px;
}

.json-editor .btn-format:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.json-editor .btn-copy {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    border-radius: 6px;
}

.json-editor .btn-copy:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

/* 编辑/创建对话框底部按钮 */
.test-cases-container :deep(.test-case-dialog .el-dialog__footer) .btn-cancel {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    border-radius: 8px;
}

.test-cases-container :deep(.test-case-dialog .el-dialog__footer) .btn-cancel:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.test-cases-container :deep(.test-case-dialog .el-dialog__footer) .btn-save {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    border-radius: 8px;
}

.test-cases-container :deep(.test-case-dialog .el-dialog__footer) .btn-save:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.test-cases-container :deep(.test-result-dialog .el-dialog__footer) .btn-close {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    border-radius: 8px;
}

.test-cases-container :deep(.test-result-dialog .el-dialog__footer) .btn-close:hover {
    background-color: var(--foreground) !important;
    border-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.test-result-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.result-section h4 {
    margin-bottom: 10px;
    color: var(--main-color);
}

.json-display {
    background-color: var(--background);
    padding: 12px;
    border-radius: 0.5em;
    overflow-x: auto;
    font-size: 13px;
    max-height: 300px;
    overflow-y: auto;
}

:deep(.el-button) {
    transition: transform 0.08s;
}

:deep(.el-button:active) {
    transform: scale(0.95);
}
</style>