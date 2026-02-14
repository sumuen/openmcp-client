<template>
    <div>
        <h3>{{ currentTool?.name }}</h3>
    </div>
    <div class="tool-executor-container">
        <el-form :model="tabStorage.formData" :rules="formRules" ref="formRef" label-position="top">
            <template v-if="currentTool?.inputSchema?.properties">
                <el-form-item v-for="[name, property] in Object.entries(currentTool.inputSchema.properties)" :key="name"
                    :label="property.title || name" :prop="name"
                    :required="currentTool.inputSchema.required?.includes(name)">
                    
                        <el-input v-if="property.type === 'string'" v-model="tabStorage.formData[name]" type="text"
                            :placeholder="property.description || t('enter') + ' ' + (property.title || name)"
                            @keydown.enter.prevent="handleExecute">
                            <template #append>
                                <VariableSelector
                                    button-text="插入变量"
                                    :tool-name="currentTool?.name || ''"
                                    :parameter-name="name"
                                    expected-type="string"
                                    @select="(variable, value) => onVariableSelected(name, variable, value)"
                                />
                            </template>
                        </el-input>

                    <el-input-number v-else-if="property.type === 'number' || property.type === 'integer'"
                        v-model="tabStorage.formData[name]" controls-position="right"
                        :placeholder="property.description || t('enter') + ' ' + (property.title || name)"
                        @keydown.enter.prevent="handleExecute" />

                    <el-switch v-else-if="property.type === 'boolean'" active-text="true" inactive-text="false"
                        v-model="tabStorage.formData[name]" />

                    <k-input-object v-else-if="property.type === 'object' || property.type === 'array'" v-model="tabStorage.formData[name]"
                        :schema="property"
                        :placeholder="property.description || t('enter') + ' ' + (property.title || name)" />

                </el-form-item>
            </template>

            <el-form-item class="executor-actions-container">
                <div class="executor-actions-wrapper">
                    <div class="left-actions">
                        <el-button-group>
                            <el-tooltip :content="t('reset')" placement="top">
                                <el-button @click="resetForm">
                                    <span class="iconfont icon-restart"></span>
                                    {{ t('reset') }}
                                </el-button>
                            </el-tooltip>
                            <el-tooltip content="Mock" placement="top">
                                <el-button
                                    @click="generateMockData"
                                    :loading="mockLoading"
                                    :disabled="loading || aiMockLoading || mockLoading"
                                >
                                    <span class="iconfont icon-dataset"></span>
                                    Mock
                                </el-button>
                            </el-tooltip>
                            <el-popover placement="top" :width="320" trigger="click" v-model:visible="aiPromptVisible">
                                <template #reference>
                                    <el-button :loading="aiMockLoading" :disabled="loading || aiMockLoading || mockLoading">
                                        <span class="iconfont icon-robot"></span>
                                        AI
                                    </el-button>
                                </template>
                                <div class="ai-config-panel">
                                    <h4 class="panel-title">{{ t('edit-ai-mock-prompt') }}</h4>
                                    <el-input
                                        type="textarea"
                                        v-model="aiMookPrompt"
                                        :rows="3"
                                        :placeholder="t('enter-message-dot')"
                                        class="mb-3"
                                    />
                                    <div class="panel-footer">
                                        <div class="flex-center">
                                            <el-switch v-model="enableXmlWrapper" size="small" />
                                            <span class="label-text">XML</span>
                                        </div>
                                        <div class="footer-btns">
                                            <el-button size="small" @click="aiPromptVisible = false">{{ t('cancel') }}</el-button>
                                            <el-button size="small" type="primary" :loading="aiMockLoading" @click="onAIMookConfirm">
                                                {{ t('confirm') }}
                                            </el-button>
                                        </div>
                                    </div>
                                </div>
                            </el-popover>
                        </el-button-group>
                    </div>

                    <div class="right-actions">
                        <el-button
                            v-if="currentTool"
                            @click="saveAsTestCase"
                            :disabled="loading"
                            class="btn-secondary"
                        >
                            <span class="iconfont icon-save"></span>
                            {{ t('save-as-test-case') }}
                        </el-button>
                        <el-tooltip :content="t('execute-tool') + ' (Ctrl+Enter)'" placement="top">
                            <el-button
                                type="primary"
                                :loading="loading"
                                @click="handleExecute"
                                class="btn-execute"
                            >
                                <span class="iconfont icon-play"></span>
                                {{ t('execute-tool') }}
                            </el-button>
                        </el-tooltip>
                    </div>
                </div>
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, defineProps, watch, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { tabs } from '../../../panel';
import type { ToolStorage } from '../../tools';
import { getDefaultValue, normaliseJavascriptType } from '@/hook/mcp';

import KInputObject from '@/components/k-input-object/index.vue';
import { mcpClientAdapter } from '@/views/connect/core';
import { JSONSchemaFaker } from 'json-schema-faker';

import { faker } from '@faker-js/faker';
import VariableSelector from './variable-selector.vue';
import { initVariableStore, getVariables } from '../../variable-management/store';
import type { ToolVariable } from '../../variable-management/types';

// 插件注入
JSONSchemaFaker.extend('faker', () => faker);

// 可选设置
JSONSchemaFaker.option({
  useDefaultValue: true,
  alwaysFakeOptionals: true
});

defineComponent({ name: 'tool-executor' });
const mockLoading = ref(false);
const aiMockLoading = ref(false);
const aiPromptVisible = ref(false);
const enableXmlWrapper = ref(false);

const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as ToolStorage;

if (!tabStorage.formData) {
    tabStorage.formData = {};
}

const formRef = ref<FormInstance>();
const loading = ref(false);

const currentTool = computed(() => {
    for (const client of mcpClientAdapter.clients) {
        const tool = client.tools?.get(tabStorage.currentToolName);
        if (tool) {
            console.log(tool);

            return tool;
        }
    }
});

const aiMookPrompt = ref(`please call the tool ${currentTool.value?.name || ''} to make some test`);

// 初始化变量存储（绑定到主客户端，确保变量可用）
try {
    initVariableStore(mcpClientAdapter.masterNode);
} catch (e) {
    // 已初始化或无主客户端时忽略
}

// 选择变量后，向指定输入插入占位符 ${变量名称}
function onVariableSelected(fieldName: string, variable: ToolVariable, _value: any) {
    const placeholder = `\${${variable.name}}`;
    const cur = tabStorage.formData[fieldName];
    if (typeof cur === 'string') {
        tabStorage.formData[fieldName] = cur + placeholder;
    } else if (cur === undefined || cur === null) {
        tabStorage.formData[fieldName] = placeholder;
    } else {
        // 非字符串字段，强制转字符串附加
        tabStorage.formData[fieldName] = String(cur) + placeholder;
    }
    // 清除该字段校验提示
    formRef.value?.clearValidate?.([fieldName as any]);
}

// 提供一个类型完备的包装函数，避免模板中内联箭头函数导致隐式 any 报错
function onVariableSelectedWrapper(fieldName: string) {
    return (variable: ToolVariable, value: any) => onVariableSelected(fieldName, variable, value);
}

// 解析表单中的占位符，替换为变量值
function resolveFormPlaceholders(data: any): any {
    const variables = getVariables();
    const map = new Map<string, any>();
    for (const v of variables) {
        try {
            map.set(v.name, JSON.parse(v.value));
        } catch {
            map.set(v.name, v.value);
        }
    }

    const isPlainObject = (val: any) => Object.prototype.toString.call(val) === '[object Object]';

    const replaceInString = (s: string) => {
        // 完全匹配单一占位符时，直接返回真实值（保持类型）
        const exact = s.match(/^\$\{([^}]+)\}$/);
        if (exact) {
            const name = exact[1];
            if (map.has(name)) return map.get(name);
            return s;
        }
        // 含有多个占位符时，进行字符串级替换
        return s.replace(/\$\{([^}]+)\}/g, (_m, g1) => {
            const val = map.get(g1);
            if (val === undefined) return _m; // 未找到则保留原样
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                return String(val);
            }
            try {
                return JSON.stringify(val);
            } catch {
                return String(val);
            }
        });
    };

    const deep = (val: any): any => {
        if (typeof val === 'string') return replaceInString(val);
        if (Array.isArray(val)) return val.map(deep);
        if (isPlainObject(val)) {
            const out: Record<string, any> = {};
            for (const k of Object.keys(val)) out[k] = deep(val[k]);
            return out;
        }
        return val;
    };

    return deep(data);
}

const formRules = computed<FormRules>(() => {
    const rules: FormRules = {};

    if (!currentTool.value?.inputSchema?.properties) return rules;

    Object.entries(currentTool.value.inputSchema.properties).forEach(([name, property]) => {
        if (currentTool.value?.inputSchema?.required?.includes(name)) {
            rules[name] = [
                {
                    required: true,
                    message: `${property.title || name} ` + t("is-required"),
                    trigger: 'blur'
                }
            ];
        }
    });

    return rules;
});


const initFormData = () => {
    // 初始化，根据输入的 inputSchema 校验
    // 1. 当前是否存在缺失的 key value，如果有，则根据 schema 给与默认值
    // 2. 如果有多余的 key value，则删除

    if (!currentTool.value?.inputSchema?.properties) return;

    const newSchemaDataForm: Record<string, number | boolean | string | object> = {};

    console.log(currentTool.value.inputSchema);

    Object.entries(currentTool.value.inputSchema.properties).forEach(([name, property]) => {
        newSchemaDataForm[name] = getDefaultValue(property);
        const rawType = Array.isArray(tabStorage.formData[name]) ? 'array' : typeof tabStorage.formData[name];        
        const originType = normaliseJavascriptType(rawType);

        if (tabStorage.formData[name] !== undefined && originType === property.type) {
            newSchemaDataForm[name] = tabStorage.formData[name];
        }
    });

    tabStorage.formData = newSchemaDataForm;
};

const resetForm = () => {
    formRef.value?.resetFields();
};

import { TaskLoop } from '@/components/main-panel/chat/core/task-loop';
import type { ChatStorage } from '../../../chat/chat-box/chat';

const onAIMookConfirm = async () => {
    aiPromptVisible.value = false;
    await generateAIMockData(aiMookPrompt.value);
};

const generateAIMockData = async (prompt?: string) => {
    if (!currentTool.value?.inputSchema) return;
    aiMockLoading.value = true;
    try {
        const loop = new TaskLoop({ maxEpochs: 1 });
        const usePrompt = prompt || `please call the tool ${currentTool.value.name} to make some test`;
        const chatStorage = {
            id: '',
            messages: [],
            settings: {
                temperature: 0.6,
                systemPrompt: '',
                enableTools: [{
                    name: currentTool.value.name,
                    description: currentTool.value.description,
                    inputSchema: currentTool.value.inputSchema,
                    enabled: true
                }],
                enableWebSearch: false,
                contextLength: 5,
                enableXmlWrapper: enableXmlWrapper.value,
                parallelToolCalls: false
            }
        } as ChatStorage;

        loop.setMaxEpochs(1);

        let aiMockJson: any = undefined;

        loop.registerOnToolCall(toolCall => {
            console.log(toolCall);
            
            if (toolCall.function?.name === currentTool.value?.name) {
                try {
                    const toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
                    aiMockJson = toolArgs;
                } catch (e) {
                    ElMessage.error('AI 生成的 JSON 解析错误');
                }
            } else {
                ElMessage.error('AI 调用了未知的工具');
            }
            loop.abort();
            return toolCall;
        });

        loop.registerOnError(error => {
            ElMessage.error(error + '');
        });

        await loop.start(chatStorage, usePrompt);

        if (aiMockJson && typeof aiMockJson === 'object') {
            Object.keys(aiMockJson).forEach(key => {
                tabStorage.formData[key] = aiMockJson[key];
            });
            formRef.value?.clearValidate?.();
        }
    } finally {
        aiMockLoading.value = false;
    }
};

const generateMockData = async () => {
    if (!currentTool.value?.inputSchema) return;
    mockLoading.value = true;

    try {
        const mockData = await JSONSchemaFaker.generate(currentTool.value.inputSchema as any) as any;

        const schemaProperties = currentTool.value.inputSchema?.properties || {};

        Object.keys(mockData).forEach(key => {
            const schema = schemaProperties[key];

            // 非 schema 中定义的字段，跳过
            if (!schema) return;

            // 如果是 object 类型，需要清洗掉嵌套中未定义的字段
            if (schema.type === 'object') {
                const mockObj = mockData[key];
                const subSchemaProps = (schema as any).properties || {};
                const cleanObj: Record<string, any> = {};

                Object.keys(mockObj).forEach(subKey => {
                    if (subSchemaProps[subKey]) {
                        cleanObj[subKey] = mockObj[subKey];
                    }
                });

                tabStorage.formData[key] = cleanObj;
            } else {
                tabStorage.formData[key] = mockData[key];
            }
        });

        formRef.value?.clearValidate?.();
    } catch (e) {
        ElMessage.error('mock data 生成失败');
        console.error(e);
    } finally {
        mockLoading.value = false;
    }
};


async function handleExecute() {
    if (!currentTool.value) return;
    loading.value = true;
    try {
        tabStorage.lastToolCallResponse = undefined;
        const resolvedForm = resolveFormPlaceholders(tabStorage.formData);
        const toolResponse = await mcpClientAdapter.callTool(tabStorage.currentToolName, resolvedForm);
        tabStorage.lastToolCallResponse = toolResponse;
    } finally {
        loading.value = false;
    }
}

import type { TestCase, ToolStorage as ToolStorageType } from '../../tools';
import { initTestCasesStore, testCasesState, saveTestCases } from '../test-cases/store';

function saveAsTestCase() {
    if (!currentTool.value) return;
    if (!mcpClientAdapter.masterNode) {
        ElMessage.warning(t('preset-requires-connection'));
        return;
    }
    try {
        initTestCasesStore(mcpClientAdapter.masterNode);
    } catch { /* 已初始化忽略 */ }

    const now = Date.now();
    const newTestCase: TestCase = {
        id: `test_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name: `${currentTool.value.name}_test_${new Date().toLocaleString()}`,
        toolName: currentTool.value.name,
        description: t('auto-generated-from-executor'),
        input: { ...tabStorage.formData },
        status: 'pending',
        createdAt: now,
        updatedAt: now
    };
    // 若有执行结果，一并保存为预期输出
    if (tabStorage.lastToolCallResponse !== undefined && tabStorage.lastToolCallResponse !== null) {
        newTestCase.expectedOutput = typeof tabStorage.lastToolCallResponse === 'string'
            ? { content: [{ type: 'text', text: tabStorage.lastToolCallResponse }], isError: false }
            : tabStorage.lastToolCallResponse;
        newTestCase.status = 'passed';
    }

    testCasesState.value = [...(testCasesState.value || []), newTestCase];
    saveTestCases();
    ElMessage.success(t('test-case-saved-successfully'));
}

watch(currentTool, (tool) => {
    aiMookPrompt.value = `please call the tool ${tool?.name || ''} to make some test`;
});

watch(() => tabStorage.currentToolName, () => {
    initFormData();
    resetForm();
}, { immediate: true });

</script>

<style>
.tool-executor-container {
    background-color: var(--background);
    padding: 10px 12px;
    border-radius: .5em;
    margin-bottom: 15px;
}


.tool-executor-container .el-switch .el-switch__action {
    background-color: var(--main-color);
}

.tool-executor-container .el-switch.is-checked .el-switch__action {
    background-color: var(--sidebar);
}

.tool-executor-container .el-switch__core {
    border: 1px solid var(--main-color) !important;
}

/* 执行器操作栏：语义分层（左侧辅助 / 右侧核心）、顶部分割、图标+文字 */
.executor-actions-container {
    margin-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
    padding-top: 16px;
}

.executor-actions-container :deep(.el-form-item__content) {
    width: 100%;
}

.executor-actions-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 12px;
}

.flex-center {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* 左侧：重置 / Mock / AI（透明主题色按钮组） */
.left-actions .el-button-group {
    display: inline-flex;
}

.left-actions .el-button-group .el-button {
    border-radius: 0;
    border: 1px solid var(--main-light-color-70);
    background-color: var(--main-light-color-20);
    color: var(--main-light-color-70);
}

.left-actions .el-button-group .el-button .iconfont {
    margin-right: 6px;
}

.left-actions .el-button-group > *:first-child .el-button {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
}

.left-actions .el-button-group > *:last-child .el-button {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
}

.left-actions .el-button-group .el-button:hover:not(:disabled) {
    border-color: var(--main-light-color-90);
    background-color: var(--main-light-color-40);
    color: var(--main-light-color-90);
}

.left-actions .el-button-group .el-button.is-disabled {
    opacity: 0.5;
}

/* 右侧：保存为测试用例（次要）+ 执行（primary 主操作） */
.right-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.right-actions .btn-secondary .iconfont,
.right-actions .btn-execute .iconfont {
    margin-right: 6px;
}

.btn-execute {
    border-radius: 8px;
    padding-left: 20px;
    padding-right: 20px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* AI 配置 Popover 面板 */
.ai-config-panel .panel-title {
    margin: 0 0 12px 0;
    font-size: 13px;
    color: var(--el-text-color-primary);
}

.ai-config-panel .panel-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
}

.ai-config-panel .label-text {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.ai-config-panel .mb-3 {
    margin-bottom: 12px;
}

.ai-config-panel .footer-btns {
    display: flex;
    gap: 8px;
}

.tool-executor-container .el-button:active {
    transform: scale(0.95);
    transition: transform 0.08s;
}

.el-tag.el-tag--info {
    background-color: var(--main-color);
}

</style>