<template>
    <el-tooltip :content="t('tool-use')" placement="top" effect="light">
        <div class="setting-button" :class="{ 'active': availableToolsNum > 0 }" @click="toggleTools">
            <span class="iconfont icon-tool badge-outer">
                <span class="badge-inner">
                    {{ availableToolsNum }}
                </span>
            </span>
        </div>

    </el-tooltip>

    <el-dialog v-model="showToolsDialog" width="800px" class="chat-option-dialog tools-dialog">

        <template #header>
            <div class="tools-dialog-header">
                <span class="tools-dialog-title">{{ t('tool-manage') }}</span>
                <el-tooltip :content="t('enable-xml-wrapper')" placement="top" effect="light">
                    <span class="xml-tag" :class="{
                        'active': tabStorage.settings.enableXmlWrapper
                    }" @click="tabStorage.settings.enableXmlWrapper = !tabStorage.settings.enableXmlWrapper">xml</span>
                </el-tooltip>
            </div>
        </template>

        <div class="tools-dialog-body">
            <div class="tools-dialog-container">
            <el-scrollbar height="400px" class="tools-list">
                <div v-for="(tool, index) in tabStorage.settings.enableTools" :key="index" class="tool-item">
                    <div class="tool-info">
                        <div class="tool-name">
                            {{ tool.name }}
                            <div v-if="tool.enabled">
                                <span class="xml-tag" :class="{
                                    'active': tool.deferLoading
                                }" @click="tool.deferLoading = !tool.deferLoading">defer</span>
                            </div>
                        </div>
                        <div v-if="tool.description" class="tool-description">{{ tool.description }}</div>
                    </div>
                    <el-switch v-model="tool.enabled" />
                </div>
            </el-scrollbar>

            <el-scrollbar height="400px" class="schema-viewer">
                <!-- 如果激活 xml 指令包裹，则展示对应的 prompt -->
                <div v-if="tabStorage.settings.enableXmlWrapper" v-html="activeToolsXmlPrompt" />
                <!-- 如果是普通模式，则展示普通的工具列表 -->
                <div v-else v-html="activeToolsSchemaHTML" />
            </el-scrollbar>
            </div>
        </div>
        <template #footer>
            <div class="tools-dialog-footer">
                <el-button-group class="executor-actions-group">
                    <el-button class="btn-secondary" @click="enableAllTools">{{ t('enable-all-tools') }}</el-button>
                    <el-button class="btn-secondary btn-danger-secondary" @click="disableAllTools">{{ t('disable-all-tools') }}</el-button>
                    <el-button type="primary" class="btn-execute" @click="showToolsDialog = false">{{ t("close") }}</el-button>
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
import { mcpClientAdapter } from '@/views/connect/core';
import { toolSchemaToPromptDescription } from '../../core/xml-wrapper';

const { t } = useI18n();

const tabStorage = inject('tabStorage') as ChatStorage;

const showToolsDialog = ref(false);

const availableToolsNum = computed(() => {
    return tabStorage.settings.enableTools.filter(tool => tool.enabled).length;
});

// 修改 toggleTools 方法
const toggleTools = () => {
    showToolsDialog.value = true;
};


const activeToolsSchemaHTML = computed(() => {
    const toolsSchema = getToolSchema(tabStorage.settings.enableTools);
    const jsonString = JSON.stringify(toolsSchema, null, 2);

    return markdownToHtml(
        "```json\n" + jsonString + "\n```"
    );
});

const activeToolsXmlPrompt = computed(() => {
    const prompt = toolSchemaToPromptDescription(tabStorage.settings.enableTools);
    return markdownToHtml(
        "```markdown\n" + prompt + "\n```"
    );
});

// 新增方法 - 激活所有工具
const enableAllTools = () => {
    tabStorage.settings.enableTools.forEach(tool => {
        tool.enabled = true;
    });
};

// 新增方法 - 禁用所有工具
const disableAllTools = () => {
    tabStorage.settings.enableTools.forEach(tool => {
        tool.enabled = false;
    });
};

// 更新工具列表的方法
const updateToolsList = async () => {
    // 将新的 tool 和并进入 tabStorage.settings.enableTools 中
    // 只需要保证 enable 信息同步即可，其余工具默认开启
    const disableToolNames = new Set<string>(
        tabStorage.settings.enableTools
            .filter(tool => !tool.enabled)
            .map(tool => tool.name)
    );

    const newTools: EnableToolItem[] = [];

    for (const client of mcpClientAdapter.clients) {
        const tools = await client.getTools({ cache: false });
        if (tools) {
            for (const tool of tools.values()) {
                const enabled = !disableToolNames.has(tool.name);

                newTools.push({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                    enabled
                });
            }
        }
    }

    tabStorage.settings.enableTools = newTools;
}



onMounted(async () => {
    await updateToolsList();
    watch(() => mcpClientAdapter.refreshSignal.value, async () => {
        await updateToolsList();
    });
});

</script>

<style scoped>
.tools-dialog-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-right: 24px;
}
.tools-dialog-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-dialog-title-color);
}

.tools-dialog-body {
    padding: 4px 0;
}

.xml-tag {
    margin-left: 0;
    border-radius: .5em;
    padding: 2px 5px;
    font-size: 12px;
    font-weight: 900;
    color: black;
    background-color: var(--main-color);
    opacity: 0.3;
    transition: var(--animation-3s);
    cursor: pointer;
}

.xml-tag.active {
    opacity: 1;
    transition: var(--animation-3s);
}

/* Footer 按钮组：与导出/提示词/模型等对话框一致 */
.tools-dialog-footer {
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
.btn-danger-secondary {
    color: var(--el-color-danger) !important;
}
.executor-actions-group .el-button.btn-danger-secondary:hover:not(:disabled) {
    color: var(--el-color-danger) !important;
    border-color: var(--el-color-danger-light-5);
    background-color: var(--el-color-danger-light-9);
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