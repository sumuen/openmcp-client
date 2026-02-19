<template>
    <div class="batch-agent-trace">
        <div v-for="(message, index) in renderMessages" :key="index"
            :class="['trace-message-item', message.role.split('/')[0], message.role.split('/')[1] || '']">
            <div v-if="message.role === 'user'" class="trace-message-content trace-user">
                <Message.User :message="message" :tab-id="tabId" />
            </div>
            <div v-else-if="message.role === 'assistant/content'" class="trace-message-content trace-assistant">
                <Message.Assistant :message="message" :tab-id="tabId" />
            </div>
            <div v-else-if="message.role === 'assistant/tool_calls'" class="trace-message-content trace-toolcall">
                <Message.Toolcall :message="message" :tab-id="tabId" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChatMessage } from '../chat/chat-box/chat';
import type { IRenderMessage, IToolRenderMessage } from '../chat/chat-box/chat';
import { MessageState } from '../chat/chat-box/chat';
import * as Message from '../chat/message';

const props = defineProps<{
    messages: ChatMessage[];
    tabId: number;
    inputRichContent?: import('../chat/chat-box/chat').RichTextItem[];
    /** 当 messages 为空时，用此作为占位用户输入展示 */
    fallbackInput?: string;
}>();

function chatMessagesToRenderMessages(
    messages: ChatMessage[],
    inputRichContent?: import('../chat/chat-box/chat').RichTextItem[],
    fallbackInput?: string
): IRenderMessage[] {
    if (!messages.length && fallbackInput !== undefined) {
        return [{
            role: 'user',
            content: fallbackInput,
            ...(inputRichContent?.length && { richContent: inputRichContent }),
            extraInfo: { created: 0, state: MessageState.None, serverName: '', enableXmlWrapper: false }
        }];
    }
    const result: IRenderMessage[] = [];
    const indexAdapter = (toolCall: any) => toolCall.index ?? 0;
    let firstUserSeen = false;

    for (const m of messages) {
        if (m.role === 'user') {
            const hasMsgRich = (m as any).richContent?.length;
            const useInputRich = !firstUserSeen && inputRichContent?.length;
            firstUserSeen = true;
            result.push({
                role: 'user',
                content: typeof m.content === 'string' ? m.content : '',
                ...((hasMsgRich && { richContent: (m as any).richContent }) || (useInputRich && { richContent: inputRichContent })),
                extraInfo: (m as any).extraInfo || { created: 0, state: MessageState.None, serverName: '', enableXmlWrapper: false }
            });
        } else if (m.role === 'assistant') {
            const am = m as any;
            if (am.tool_calls?.length) {
                result.push({
                    role: 'assistant/tool_calls',
                    content: am.content || '',
                    toolResults: Array(am.tool_calls.length).fill([]),
                    tool_calls: am.tool_calls,
                    showJson: ref(false),
                    extraInfo: am.extraInfo || { created: 0, state: MessageState.None, serverName: '', enableXmlWrapper: false }
                } as IToolRenderMessage);
            } else {
                result.push({
                    role: 'assistant/content',
                    content: am.content || '',
                    extraInfo: am.extraInfo || { created: 0, state: MessageState.None, serverName: '', enableXmlWrapper: false }
                });
            }
        } else if (m.role === 'tool') {
            const tm = m as any;
            const last = result[result.length - 1];
            if (last && last.role === 'assistant/tool_calls') {
                const idx = indexAdapter({ index: tm.index });
                const content = tm.content;
                (last as IToolRenderMessage).toolResults[idx] = Array.isArray(content) ? content : (content ? [content] : []);
                if (tm.extraInfo?.usage) {
                    last.extraInfo.usage = last.extraInfo.usage || tm.extraInfo.usage;
                }
            }
        }
    }
    return result;
}

const renderMessages = computed(() => chatMessagesToRenderMessages(props.messages, props.inputRichContent, props.fallbackInput));
</script>

<style scoped>
.batch-agent-trace {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.trace-message-item {
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    overflow: hidden;
}

.trace-message-content {
    padding: 12px;
}

.trace-user {
    background-color: var(--el-fill-color-lighter);
}

.trace-assistant {
    background-color: var(--el-fill-color-blank);
}

.trace-toolcall {
    background-color: var(--el-fill-color-blank);
}
</style>
