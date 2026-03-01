<template>
    <el-tooltip :content="t('export-mcp-config-title')" placement="top" effect="light">
        <div class="setting-button" @click="toggleDialog">
            <span class="iconfont icon-deploy"></span>
        </div>
    </el-tooltip>

    <el-dialog
        v-model="showDialog"
        width="800px"
        class="export-mcp-config-dialog chat-option-dialog"
    >
        <template #header>
            <div class="export-dialog-header">
                <span class="export-dialog-title">{{ t('export-mcp-config-title') }}</span>
                <p class="export-dialog-subtitle">{{ t('export-mcp-config-intro') }}</p>
            </div>
        </template>
        <div class="export-dialog-body">
            <div class="export-meta-row">
                <label class="export-meta-label">{{ t('export-filename') }}</label>
                <el-input
                    v-model="exportFileName"
                    class="export-filename-input"
                >
                    <template #append>.json</template>
                </el-input>
                <span class="export-how-to-use" @click="gotoHowtoUse">
                    <span class="iconfont icon-info"></span>
                    <span>{{ t('how-to-use') }}</span>
                </span>
            </div>
            <div class="export-preview-section">
                <h4 class="export-preview-title">{{ t('export-mcp-config-preview') }}</h4>
                <el-scrollbar height="360px" class="export-preview-scroll">
                    <div class="export-preview-code" v-html="exportJson"></div>
                </el-scrollbar>
            </div>
        </div>

        <template #footer>
            <div class="export-dialog-footer">
                <el-button-group class="executor-actions-group">
                    <el-button class="btn-secondary" @click="copyCode">{{ t('copy') }}</el-button>
                    <el-button type="primary" class="btn-execute" @click="exportCode">{{ t('export') }}</el-button>
                </el-button-group>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { type ChatStorage, type EnableToolItem, getToolSchema } from '../chat';
import { markdownToHtml } from '@/components/main-panel/chat/markdown/markdown';
import { llmManager, llms } from '@/views/setting/llm';
import { mcpClientAdapter } from '@/views/connect/core';
import { mcpSetting } from '@/hook/mcp';
import { ElMessage } from 'element-plus';
import { useMessageBridge } from '@/api/message-bridge';
import { gotoWebsite } from '@/hook/util';

const { t, locale } = useI18n();

const showDialog = ref(false);
const exportJson = ref('');
const exportFileName = ref('mcpconfig');

// 修改 toggleDialog 方法
const toggleDialog = () => {
    showDialog.value = true;
};

const generateExportData = computed(() => {
    const currentLLM = llms[llmManager.currentModelIndex];

    const mcpServers = {} as any;
    for (const client of mcpClientAdapter.clients) {

        const option = client.connectOption;
        const type = option.connectionType;

        if (type === 'STDIO') {
            mcpServers[client.name] = {
                type: 'stdio',
                command: option.command,
                args: option.args,
                cwd: option.cwd,
                description: "",
            }
        } else if (type === 'SSE') {
            mcpServers[client.name] = {
                type: 'sse',
                url: option.url,
                description: "",
            }
        } else {
            mcpServers[client.name] = {
                type: 'http',
                url: option.url,
                description: "",
            }
        }

        if (client.connectionEnvironment.data.length > 0) {
            const env = {} as Record<string, string>;
            for (const item of client.connectionEnvironment.data) {
                env[item.key] = item.value;
            }

            mcpServers[client.name].env = env;
        }
    }

    const mcpconfig = {
        version: "0.0.1",
        namespace: "openmcp",
        mcpServers,
        defaultLLM: {
            baseURL: currentLLM.baseUrl,
            apiToken: currentLLM.userToken,
            model: currentLLM.userModel
        },
        skillPath: mcpSetting.skillPath?.trim() ?? ''
    };

    return JSON.stringify(mcpconfig, null, 2);
});

const innerMarkdownHtml = (code: string) => {
    const rawCode = markdownToHtml(code);
    const doc = new DOMParser().parseFromString(rawCode, 'text/html');
    const pres = doc.querySelectorAll('pre');

    if (pres.length < 2) {
        return '';
    }

    const inner = pres[1].outerHTML;
    return inner;
}

const exampleCode = computed(() => {
    return innerMarkdownHtml(
        '```typescript\n' +
        `import { OmAgent } from 'openmcp-sdk/service/sdk';

const agent = new OmAgent();

agent.loadMcpConfig('/path/to/${exportFileName.value}.json');

const prompt = await agent.getPrompt('hacknews', { topn: '5' });    
const res = await agent.ainvoke({ messages: prompt });

console.log('⚙️ Agent Response', res);
` +
        '\n```'
    );
});

const copyCode = async () => {
    try {
        await navigator.clipboard.writeText(generateExportData.value);
        ElMessage.success(t('copy-success'));
    } catch (error) {
        ElMessage.error(t('copy-fail'));
    }
}

const exportCode = async () => {
    const bridge = useMessageBridge();
    bridge.postMessage({
        command: 'vscode/export-file',
        data: {
            filename: exportFileName.value,
            content: generateExportData.value
        }
    })
}

const gotoHowtoUse = () => {
    if (locale.value === 'zh') {
        gotoWebsite('https://openmcp.kirigaya.cn/zh/sdk-tutorial/#%E4%BD%BF%E7%94%A8');
    } else if (locale.value === 'ja') {
        gotoWebsite('https://openmcp.kirigaya.cn/ja/sdk-tutorial/#%E4%BD%BF%E7%94%A8%E6%96%B9%E6%B3%95');
    } else {
        gotoWebsite('https://openmcp.kirigaya.cn/sdk-tutorial/#usage');
    }
}

function refreshExportJson() {
    exportJson.value = innerMarkdownHtml(
        '```json\n' + generateExportData.value + '\n```'
    );
}

onMounted(refreshExportJson);

watch([showDialog, generateExportData], () => {
    if (showDialog.value) refreshExportJson();
});

</script>

<style scoped>
.export-dialog-header {
    padding-right: 24px;
}
.export-dialog-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-dialog-title-color);
}
.export-dialog-subtitle {
    margin: 6px 0 0 0;
    font-size: 13px;
    line-height: 1.5;
    opacity: 0.5;
    color: var(--el-text-color-primary);
}

.export-dialog-body {
    padding: 4px 0;
}

.export-meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
}

.export-meta-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    flex-shrink: 0;
}

.export-filename-input {
    max-width: 280px;
}

.export-how-to-use {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--el-color-primary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: background-color 0.2s;
}
.export-how-to-use:hover {
    background-color: var(--el-fill-color-light);
}

.export-preview-section {
    margin-top: 4px;
}

.export-preview-title {
    margin: 0 0 8px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    letter-spacing: 0.02em;
}

.export-preview-scroll {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
}

.export-preview-code {
    padding: 12px 16px;
    font-family: var(--code-font-family, ui-monospace, monospace);
    font-size: 13px;
    line-height: 1.5;
    color: var(--el-text-color-primary);
}

/* Footer 按钮组：与提示词对话框一致，右对齐 */
.export-dialog-footer {
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
    background-color: var(--main-light-color-30);
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
