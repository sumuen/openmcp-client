<template>
    <div class="trace-table-container">
        <el-table 
            :data="tableData" 
            style="width: 100%" 
            row-class-name="trace-table-row"
            @row-click="handleRowClick"
        >
            <el-table-column prop="index" label="#" width="60" />
            <el-table-column prop="type" :label="t('type')" width="120" />
            <el-table-column prop="toolName" :label="t('toolbar.search.name')" show-overflow-tooltip />
            <el-table-column prop="inputTokens" :label="t('input-token')" width="120" align="right" />
            <el-table-column prop="outputTokens" :label="t('output-token')" width="120" align="right" />
            <el-table-column prop="totalTokens" :label="t('total-token')" width="120" align="right" />
            <el-table-column prop="cacheHitRate" :label="t('cache-hit-ratio')" width="120" align="right" />
            <el-table-column prop="cumulativeTokens" :label="t('cumulative-tokens')" width="150" align="right" />
            <el-table-column prop="status" :label="t('status')" width="100" align="center">
                <template #default="scope">
                    <el-tag :type="scope.row.statusType">{{ scope.row.status }}</el-tag>
                </template>
            </el-table-column>
        </el-table>

        <!-- 详细信息对话框 -->
        <el-dialog 
            v-model="dialogVisible" 
            :title="t('tool-details')" 
            width="600px"
            :before-close="handleDialogClose"
        >
            <div v-if="selectedRow">
                <el-descriptions :column="1" border>
                    <el-descriptions-item :label="t('type')">{{ selectedRow.type }}</el-descriptions-item>
                    <el-descriptions-item v-if="selectedRow.toolName" :label="t('toolbar.search.name')">{{ selectedRow.toolName }}</el-descriptions-item>
                    <el-descriptions-item v-if="selectedRow.arguments" :label="t('arguments')">
                        <pre class="arguments-pre">{{ selectedRow.arguments }}</pre>
                    </el-descriptions-item>
                    <el-descriptions-item v-if="selectedRow.result" :label="t('result')">
                        <pre class="result-pre">{{ selectedRow.result }}</pre>
                    </el-descriptions-item>
                    <el-descriptions-item :label="t('input-token')">{{ selectedRow.inputTokens }}</el-descriptions-item>
                    <el-descriptions-item :label="t('output-token')">{{ selectedRow.outputTokens }}</el-descriptions-item>
                    <el-descriptions-item :label="t('total-token')">{{ selectedRow.totalTokens }}</el-descriptions-item>
                    <el-descriptions-item :label="t('cache-hit-ratio')">{{ selectedRow.cacheHitRate }}</el-descriptions-item>
                    <el-descriptions-item :label="t('cumulative-tokens')">{{ selectedRow.cumulativeTokens }}</el-descriptions-item>
                    <el-descriptions-item :label="t('status')">
                        <el-tag :type="selectedRow.statusType">{{ selectedRow.status }}</el-tag>
                    </el-descriptions-item>
                </el-descriptions>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">{{ t('close') }}</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, defineProps, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IRenderMessage, IToolRenderMessage } from '../chat-box/chat';

const { t } = useI18n();

const props = defineProps<{
    renderMessages: IRenderMessage[];
}>();

// 表格数据
const tableData = computed(() => {
    const data = [];
    let cumulativeTokens = 0;

    for (let i = 0; i < props.renderMessages.length; i++) {
        const message = props.renderMessages[i];
        
        // 处理 assistant 消息（工具调用）
        if (message.role === 'assistant/tool_calls' && 'tool_calls' in message) {
            const toolMessage = message as IToolRenderMessage;
            for (let j = 0; j < toolMessage.tool_calls.length; j++) {
                const toolCall = toolMessage.tool_calls[j];
                const usage = toolMessage.extraInfo.usage;
                
                // 计算 token 信息
                const inputTokens = usage?.prompt_tokens || 0;
                const outputTokens = usage?.completion_tokens || 0;
                const totalTokens = usage?.total_tokens || 0;
                // 使用 CompletionUsage 中定义的 cached_tokens 字段
                const cacheHitTokens = usage?.prompt_tokens_details?.cached_tokens || 0;
                const cacheHitRate = inputTokens > 0 ? Math.round((cacheHitTokens / inputTokens) * 100) : 0;
                
                cumulativeTokens += totalTokens;
                
                data.push({
                    index: data.length + 1,
                    type: t('tool-call'),
                    toolName: toolCall.function?.name || '',
                    arguments: toolCall.function?.arguments || '',
                    inputTokens,
                    outputTokens,
                    totalTokens,
                    cacheHitRate: cacheHitRate + '%',
                    cumulativeTokens,
                    status: toolMessage.extraInfo.state === 'success' ?
                        t('success') :
                        t('failed'),
                    statusType: toolMessage.extraInfo.state === 'success' ? 'success' : 'danger',
                    rawMessage: toolMessage,
                    toolCallIndex: j
                });
            }
        } 
        // 处理 tool 消息（工具结果）
        else if ('index' in message && 'content' in message) {
            // 获取对应的工具调用
            const toolCallMessageIndex = props.renderMessages.findIndex(
                (msg, idx) => idx < i && 
                msg.role === 'assistant/tool_calls' && 
                'tool_calls' in msg &&
                msg.tool_calls && 
                msg.tool_calls.some((tc: any) => tc.index === (message as any).index)
            );
            
            if (toolCallMessageIndex !== -1) {
                const toolCallMessage = props.renderMessages[toolCallMessageIndex] as IToolRenderMessage;
                const toolCall = toolCallMessage.tool_calls?.find((tc: any) => tc.index === (message as any).index);
                const usage = (message as any).extraInfo.usage;
                
                // 计算 token 信息
                const inputTokens = usage?.prompt_tokens || 0;
                const outputTokens = usage?.completion_tokens || 0;
                const totalTokens = usage?.total_tokens || 0;
                // 使用 CompletionUsage 中定义的 cached_tokens 字段
                const cacheHitTokens = usage?.prompt_tokens_details?.cached_tokens || 0;
                const cacheHitRate = inputTokens > 0 ? Math.round((cacheHitTokens / inputTokens) * 100) : 0;
                
                cumulativeTokens += totalTokens;
                
                data.push({
                    index: data.length + 1,
                    type: 'Tool Result',
                    toolName: toolCall?.function?.name || '',
                    result: Array.isArray((message as any).content) 
                        ? (message as any).content.map((c: any) => c.text).join('\n') 
                        : (message as any).content,
                    inputTokens,
                    outputTokens,
                    totalTokens,
                    cacheHitRate: cacheHitRate + '%',
                    cumulativeTokens,
                    status: (message as any).extraInfo.state === 'success' ? t('success') : t('failed'),
                    statusType: (message as any).extraInfo.state === 'success' ? 'success' : 'danger',
                    rawMessage: message
                });
            }
        }
    }
    
    return data;
});

// 对话框相关
const dialogVisible = ref(false);
const selectedRow = ref<any>(null);

// 处理行点击事件
const handleRowClick = (row: any) => {
    selectedRow.value = row;
    dialogVisible.value = true;
};

// 处理对话框关闭事件
const handleDialogClose = () => {
    dialogVisible.value = false;
    selectedRow.value = null;
};
</script>

<style scoped>
.trace-table-container {
    padding: 16px;
    height: 100%;
    overflow-y: auto;
}

.trace-table-row {
    cursor: pointer;
}

.arguments-pre,
.result-pre {
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    padding: 8px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
}

.dialog-footer {
    text-align: right;
}
</style>