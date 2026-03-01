<template>
    <div class="setting-section">
        <h2>{{ t('debugger-mcp-service') }}</h2>
        <div class="setting-options">
            <div class="setting-option">
                <span>
                    <span class="option-title">{{ t('debugger-mcp-enable') }}</span>
                </span>
                <el-switch v-model="enabled" @change="onEnableChange" />
            </div>
            <div v-if="enabled" class="setting-option">
                <span>
                    <span class="option-title">{{ t('debugger-mcp-port') }}</span>
                </span>
                <el-input-number
                    v-model="port"
                    :min="1024"
                    :max="65535"
                    controls-position="right"
                    @change="onPortChange"
                />
            </div>
            <div v-if="enabled" class="setting-option connection-scripts-section">
                <div class="sub-item">
                    <span class="option-title">{{ t('debugger-mcp-connection-json') }}</span>
                    <el-button size="small" @click="copyActiveTabContent">
                        {{ t('debugger-mcp-copy') }}
                    </el-button>
                </div>
                <el-tabs v-model="activeScriptTab" class="connection-scripts-tabs">
                    <el-tab-pane :label="t('debugger-mcp-tab-mcp-json')" name="mcp-json">
                        <div
                            v-if="connectionJson"
                            class="connection-json-wrapper"
                        >
                            <pre class="connection-json language-json"><code class="language-json" v-html="highlightedJson"></code></pre>
                        </div>
                        <pre v-else class="connection-json connection-json--empty">{{ t('debugger-mcp-not-running') }}</pre>
                    </el-tab-pane>
                    <el-tab-pane :label="t('debugger-mcp-tab-qwen')" name="qwen">
                        <div class="connection-script-wrapper">
                            <pre class="connection-script language-bash"><code class="language-bash" v-html="highlightedQwenCommand"></code></pre>
                        </div>
                    </el-tab-pane>
                    <el-tab-pane :label="t('debugger-mcp-tab-claude')" name="claude">
                        <div class="connection-script-wrapper">
                            <pre class="connection-script language-bash"><code class="language-bash" v-html="highlightedClaudeCommand"></code></pre>
                        </div>
                    </el-tab-pane>
                    <el-tab-pane :label="t('debugger-mcp-tab-codex')" name="codex">
                        <div class="connection-script-wrapper">
                            <pre class="connection-script language-bash"><code class="language-bash" v-html="highlightedCodexCommand"></code></pre>
                        </div>
                    </el-tab-pane>
                </el-tabs>
            </div>
            <div v-if="enabled" class="setting-option tools-section">
                <span class="option-title">{{ t('debugger-mcp-exposed-tools') }}</span>
                <div class="tools-list">
                    <div
                        v-for="tool in tools"
                        :key="tool.name"
                        class="tool-row"
                    >
                        <span class="tool-name">{{ toolDisplayName(tool.name) }}</span>
                        <el-switch v-model="tool.enabled" @change="() => onToolToggle(tool)" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessageBridge } from '@/api/message-bridge';
import { ElMessage } from 'element-plus';
import { Prism } from '@/components/main-panel/chat/markdown/prism';

defineComponent({ name: 'ServiceSetting' });

const { t } = useI18n();
const bridge = useMessageBridge();
const enabled = ref(false);
const port = ref(1145);
const connectionJson = ref<string | null>(null);
const tools = ref<Array<{ name: string; enabled: boolean }>>([]);
const activeScriptTab = ref<'mcp-json' | 'qwen' | 'claude' | 'codex'>('mcp-json');

const MCP_SERVER_NAME = 'openmcp-debugger';

const qwenCommand = computed(() =>
    `qwen mcp add --transport http ${MCP_SERVER_NAME} http://localhost:${port.value}/mcp`
);
const claudeCommand = computed(() =>
    `claude mcp add --transport http ${MCP_SERVER_NAME} http://localhost:${port.value}/mcp`
);
const codexCommand = computed(() =>
    `codex mcp add --transport http ${MCP_SERVER_NAME} http://localhost:${port.value}/mcp`
);

const TOOL_LABELS: Record<string, string> = {
    openmcp_debugger_list_all_tools: 'debugger-mcp-tool-list-tools',
    openmcp_debugger_execute_tool: 'debugger-mcp-tool-execute-tool',
    openmcp_debugger_list_batch_test_samples: 'debugger-mcp-tool-list-samples',
    openmcp_debugger_execute_batch_test_sample: 'debugger-mcp-tool-execute-sample'
};

function toolDisplayName(name: string) {
    return t(TOOL_LABELS[name] || name);
}

const highlightedJson = computed(() => {
    const json = connectionJson.value;
    if (!json) return '';
    try {
        return Prism.highlight(json, Prism.languages.json, 'json');
    } catch {
        return json;
    }
});

function highlightBash(code: string): string {
    try {
        return Prism.highlight(code, Prism.languages.bash, 'bash');
    } catch {
        return code;
    }
}

const highlightedQwenCommand = computed(() => highlightBash(qwenCommand.value));
const highlightedClaudeCommand = computed(() => highlightBash(claudeCommand.value));
const highlightedCodexCommand = computed(() => highlightBash(codexCommand.value));

async function loadConfig() {
    const res = await bridge.commandRequest<{
        enabled: boolean;
        port: number;
        tools: Array<{ name: string; enabled: boolean }>;
    }>('debugger-mcp/load');
    if (res.code === 200 && res.msg) {
        enabled.value = res.msg.enabled;
        port.value = res.msg.port ?? 1145;
        tools.value = res.msg.tools ?? [];
    }
}

async function refreshConnectionInfo() {
    const res = await bridge.commandRequest<{
        running: boolean;
        connectionJson: string | null;
    }>('debugger-mcp/connection-info');
    if (res.code === 200 && res.msg) {
        connectionJson.value = res.msg.connectionJson;
    }
}

async function onEnableChange() {
    await saveConfig();
    await refreshConnectionInfo();
}

async function onPortChange() {
    await saveConfig();
}

async function saveConfig() {
    const enabledTools: Record<string, boolean> = {};
    for (const t of tools.value) {
        enabledTools[t.name] = t.enabled;
    }
    await bridge.commandRequest('debugger-mcp/save', {
        enabled: enabled.value,
        port: port.value,
        enabledTools
    });
    await refreshConnectionInfo();
}

async function onToolToggle(tool: { name: string; enabled: boolean }) {
    const res = await bridge.commandRequest('debugger-mcp/toggle-tool', {
        toolName: tool.name,
        enabled: tool.enabled
    });
    if (res.code === 200) {
        await refreshConnectionInfo();
    }
}

function getActiveTabContent(): string {
    switch (activeScriptTab.value) {
        case 'mcp-json':
            return connectionJson.value ?? '';
        case 'qwen':
            return qwenCommand.value;
        case 'claude':
            return claudeCommand.value;
        case 'codex':
            return codexCommand.value;
        default:
            return '';
    }
}

async function copyActiveTabContent() {
    const content = getActiveTabContent();
    if (activeScriptTab.value === 'mcp-json' && !content) {
        ElMessage.warning(t('debugger-mcp-not-running'));
        return;
    }
    try {
        await navigator.clipboard.writeText(content);
        ElMessage.success(t('debugger-mcp-copied'));
    } catch {
        ElMessage.error(t('debugger-mcp-copy-failed'));
    }
}

onMounted(async () => {
    await loadConfig();
    await refreshConnectionInfo();
});

watch(enabled, () => {
    if (enabled.value) refreshConnectionInfo();
});
</script>

<style scoped>
.connection-scripts-section {
    flex-direction: column;
    align-items: stretch;
}
.connection-scripts-tabs {
    margin-top: 8px;
}
.connection-scripts-tabs :deep(.el-tabs__header) {
    margin-bottom: 8px;
}
.connection-scripts-tabs :deep(.el-tabs__item) {
    font-size: 13px;
}
.connection-scripts-tabs :deep(.el-tabs__content) {
    overflow: visible;
}
.connection-script-wrapper {
    border-radius: 8px;
    overflow: hidden;
    background: var(--el-bg-color);
}
.connection-script {
    font-family: monospace;
    font-size: 12px;
    margin: 0;
    padding: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
}
.tools-section {
    flex-direction: column;
    align-items: stretch;
}
.tools-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
}
.tool-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 12px;
    border-radius: 8px;
}
.tool-name {
    font-size: 13px;
}
.connection-json-wrapper {
    border-radius: 8px;
    overflow: hidden;
    background: var(--el-bg-color);
}
.connection-json {
    font-family: monospace;
    font-size: 12px;
    margin: 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
}
.sub-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}
</style>
