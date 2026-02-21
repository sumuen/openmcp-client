<template>
    <div class="batch-agent-trace message-list">
        <div v-for="(message, index) in renderMessages" :key="index"
            :class="['message-item', message.role.split('/')[0], message.role.split('/')[1] || '']">
            <div class="message-avatar" v-if="message.role === 'assistant/content'">
                <span class="iconfont icon-robot"></span>
            </div>
            <div class="message-avatar" v-else-if="message.role === 'assistant/tool_calls'"></div>
            <div v-if="message.role === 'user'" class="message-content">
                <Message.User :message="message" :tab-id="tabId" />
            </div>
            <div v-else-if="message.role === 'assistant/content'" class="message-content">
                <Message.Assistant :message="message" :tab-id="tabId" />
            </div>
            <div v-else-if="message.role === 'assistant/tool_calls'" class="message-content">
                <Message.Toolcall
                    :message="message"
                    :tab-id="tabId"
                    :collapse-by-default="collapseToolsByDefault"
                    @update:tool-result="(value, toolIndex, itemIndex) => message.toolResults[toolIndex][itemIndex] = value"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { ChatMessage } from '../chat/chat-box/chat';
import type { IRenderMessage, IToolRenderMessage } from '../chat/chat-box/chat';
import { MessageState } from '../chat/chat-box/chat';
import * as Message from '../chat/message';
import { getIdAsIndexAdapter } from '../chat/core/handle-tool-calls';
import { getToolCallFromXmlString, getToolResultFromXmlString, getXmlsFromString, toNormaliseToolcall } from '../chat/core/xml-wrapper';

const props = defineProps<{
    messages: ChatMessage[];
    tabId: number;
    inputRichContent?: import('../chat/chat-box/chat').RichTextItem[];
    /** 当 messages 为空时，用此作为占位用户输入展示 */
    fallbackInput?: string;
    /** 工具执行详情默认折叠 */
    collapseToolsByDefault?: boolean;
}>();

function getXmlToolCalls(message: ChatMessage) {
    if (message.role !== 'assistant' && message.role !== 'user') {
        return [];
    }
    const enableXmlTools = message.extraInfo?.enableXmlWrapper ?? false;
    if (!enableXmlTools) {
        return [];
    }
    return getXmlsFromString(message.content) || [];
}

function buildSyntheticToolCall(message: any, toolIndex: number) {
    const callId = message.tool_call_id || `batch-tool-${toolIndex}`;
    return {
        id: callId,
        type: 'function',
        index: toolIndex,
        function: {
            name: message.name || 'tool',
            arguments: '{}'
        }
    } as any;
}

const renderMessages = ref<IRenderMessage[]>([]);

watchEffect(async () => {
    if (!props.messages.length && props.fallbackInput !== undefined) {
        renderMessages.value = [{
            role: 'user',
            content: props.fallbackInput,
            ...(props.inputRichContent?.length && { richContent: props.inputRichContent }),
            extraInfo: { created: 0, state: MessageState.None, serverName: '', enableXmlWrapper: false }
        }];
        return;
    }

    const nextRenderMessages: IRenderMessage[] = [];
    let firstUserSeen = false;

    for (const message of props.messages) {
        const indexAdapter = getIdAsIndexAdapter();
        const xmls = getXmlToolCalls(message);

        if (message.role === 'user') {
            if (xmls.length > 0 && message.extraInfo.enableXmlWrapper) {
                const lastAssistantMessage = nextRenderMessages[nextRenderMessages.length - 1];
                if (lastAssistantMessage && lastAssistantMessage.role === 'assistant/tool_calls') {
                    const toolCallResultXmls = getXmlsFromString(message.content);
                    for (const xml of toolCallResultXmls) {
                        const toolResult = await getToolResultFromXmlString(xml);
                        if (toolResult) {
                            const index = indexAdapter(toolResult.callId);
                            lastAssistantMessage.toolResults[index] = toolResult.toolcallContent;
                            if (lastAssistantMessage.extraInfo.state === MessageState.Unknown) {
                                lastAssistantMessage.extraInfo.state = message.extraInfo.state;
                            } else if (lastAssistantMessage.extraInfo.state === MessageState.Success
                                || message.extraInfo.state !== MessageState.Success
                            ) {
                                lastAssistantMessage.extraInfo.state = message.extraInfo.state;
                            }
                            lastAssistantMessage.extraInfo.usage = lastAssistantMessage.extraInfo.usage || message.extraInfo.usage;
                        }
                    }
                }
            } else {
                const hasMsgRich = (message as any).richContent?.length;
                const useInputRich = !firstUserSeen && props.inputRichContent?.length;
                firstUserSeen = true;
                nextRenderMessages.push({
                    role: 'user',
                    content: message.content,
                    ...((hasMsgRich && { richContent: (message as any).richContent }) || (useInputRich && { richContent: props.inputRichContent })),
                    extraInfo: message.extraInfo
                });
            }
        } else if (message.role === 'assistant') {
            if (message.tool_calls) {
                nextRenderMessages.push({
                    role: 'assistant/tool_calls',
                    content: message.content,
                    toolResults: Array(message.tool_calls.length).fill([]),
                    tool_calls: message.tool_calls,
                    showJson: ref(false),
                    extraInfo: {
                        ...message.extraInfo,
                        state: MessageState.Unknown
                    }
                } as IToolRenderMessage);
            } else if (xmls.length > 0 && message.extraInfo.enableXmlWrapper) {
                const toolCalls = [];
                for (const xml of xmls) {
                    const xmlToolCall = await getToolCallFromXmlString(xml);
                    if (xmlToolCall) {
                        toolCalls.push(
                            toNormaliseToolcall(xmlToolCall, indexAdapter)
                        );
                    }
                }
                const renderAssistantMessage = message.content.replace(/```xml[\s\S]*?```/g, '');
                nextRenderMessages.push({
                    role: 'assistant/tool_calls',
                    content: renderAssistantMessage,
                    toolResults: Array(toolCalls.length).fill([]),
                    tool_calls: toolCalls,
                    showJson: ref(false),
                    extraInfo: {
                        ...message.extraInfo,
                        state: MessageState.Unknown
                    }
                } as IToolRenderMessage);
            } else {
                nextRenderMessages.push({
                    role: 'assistant/content',
                    content: message.content,
                    extraInfo: message.extraInfo
                });
            }
        } else if (message.role === 'tool') {
            const lastAssistantMessage = nextRenderMessages[nextRenderMessages.length - 1];
            if (lastAssistantMessage && lastAssistantMessage.role === 'assistant/tool_calls') {
                const safeIndex = typeof message.index === 'number' ? message.index : 0;
                if (!lastAssistantMessage.tool_calls[safeIndex]) {
                    lastAssistantMessage.tool_calls[safeIndex] = buildSyntheticToolCall(message, safeIndex);
                    lastAssistantMessage.toolResults[safeIndex] = [];
                }
                lastAssistantMessage.toolResults[safeIndex] = message.content;
                if (lastAssistantMessage.extraInfo.state === MessageState.Unknown) {
                    lastAssistantMessage.extraInfo.state = message.extraInfo.state;
                } else if (lastAssistantMessage.extraInfo.state === MessageState.Success
                    || message.extraInfo.state !== MessageState.Success
                ) {
                    lastAssistantMessage.extraInfo.state = message.extraInfo.state;
                }
                lastAssistantMessage.extraInfo.usage = lastAssistantMessage.extraInfo.usage || message.extraInfo.usage;
            } else if (lastAssistantMessage && lastAssistantMessage.role === 'assistant/content') {
                // 兜底：某些消息序列缺失 assistant.tool_calls 字段，但后续确实有 tool 结果
                const prev = lastAssistantMessage;
                nextRenderMessages.pop();
                const safeIndex = typeof message.index === 'number' ? message.index : 0;
                const fallbackToolMessage: IToolRenderMessage = {
                    role: 'assistant/tool_calls',
                    content: prev.content,
                    toolResults: [],
                    tool_calls: [],
                    showJson: ref(false),
                    extraInfo: {
                        ...prev.extraInfo,
                        state: MessageState.Unknown
                    }
                };
                fallbackToolMessage.tool_calls[safeIndex] = buildSyntheticToolCall(message, safeIndex);
                fallbackToolMessage.toolResults[safeIndex] = message.content;
                fallbackToolMessage.extraInfo.state = message.extraInfo.state;
                fallbackToolMessage.extraInfo.usage = message.extraInfo.usage || fallbackToolMessage.extraInfo.usage;
                nextRenderMessages.push(fallbackToolMessage);
            }
        }
    }

    renderMessages.value = nextRenderMessages;
});
</script>

<style scoped>
.batch-agent-trace {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 2px 0;
}

.message-item {
    display: flex;
    margin-bottom: 2px;
}

.message-avatar {
    margin-right: 12px;
    margin-top: 1px;
}

.message-content {
    flex: 1;
    width: 100%;
}

.assistant {
    text-align: left;
    margin-top: 10px;
}

.assistant.tool_calls {
    margin-top: 2px;
}

.user {
    flex-direction: row-reverse;
    text-align: right;
}

.user .message-avatar {
    margin-right: 0;
    margin-left: 12px;
}

.user .message-content {
    align-items: flex-end;
}

:deep(.message-role) {
    font-weight: bold;
    margin-bottom: 4px;
    font-size: var(--chat-font-size);
    color: var(--el-text-color-regular);
}

:deep(.message-text) {
    font-size: var(--chat-font-size);
    line-height: 1.5;
}

:deep(.user .message-text) {
    margin-top: 8px;
    margin-bottom: 8px;
    width: 100%;
}

:deep(.user .message-content > span) {
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
    padding: 8px 12px;
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-word;
    text-align: left;
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 6px;
}
</style>
