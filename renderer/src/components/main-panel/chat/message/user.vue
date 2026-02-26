<template>
    <div class="message-role"></div>
    <div class="message-text">
        <div class="message-body">
        <!-- 当消息包含 skill 上下文时，在左侧显示 SKILL 标识 -->
        <div v-if="hasSkillContext" class="skill-context-badge" :title="t('skill-context-included') || '此消息包含 SKILL 上下文'">
            <span class="skill-badge-text">SKILL</span>
        </div>
        <div v-if="!isEditing" class="message-content">
            <span>
                <template v-if="hasRichContent">
                    <template v-for="(item, index) in richContentItems" :key="index">
                        <!-- 与输入框 prompt 卡片同一套悬停弹窗：el-popover + RichCardPromptPopoverContent -->
                        <el-popover
                            v-if="item.type === 'prompt'"
                            placement="top"
                            :width="420"
                            trigger="click"
                            popper-class="rich-card-prompt-popover"
                            persistent
                        >
                            <template #default>
                                <RichCardPromptPopoverContent
                                    :item="item"
                                    @update:item="(newItem) => updateRichContentItem(index, newItem)"
                                />
                            </template>
                            <template #reference>
                                <span class="rich-card-prompt rich-card-prompt--readonly">
                                    <span class="iconfont icon-chat"></span>
                                    <span class="rich-card-prompt__label">{{ item.text }}</span>
                                </span>
                            </template>
                        </el-popover>
                        <RichCardResource v-else-if="item.type === 'resource'" :item="item" readonly />
                        <span v-else class="message-plain-text">{{ item.text }}</span>
                    </template>
                </template>
                <template v-else>{{ props.message.content.trim() }}</template>
            </span>
        </div>
        
        <KCuteTextarea v-else
            v-model="userInput"
            :placeholder="t('enter-message-dot')"
            @press-enter="handleKeydown"
        />
        </div>
        <div class="message-actions" v-if="!isEditing">
            <el-button @click="copy">
                <span class="iconfont icon-copy"></span>
            </el-button>
            <el-button @click="reload">
                <span class="iconfont icon-restart"></span>
            </el-button>
            <el-button @click="toggleEdit">
                <span class="iconfont icon-edit2"></span>
            </el-button>
        </div>
        <div class="message-actions" v-else>
            <el-button @click="toggleEdit">
                {{ '取消' }}
            </el-button>
            <el-button @click="handleKeydown" type="primary">
                {{ '发送' }}
            </el-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, type PropType, inject, watch, type Ref, computed } from 'vue';
import { tabs } from '../../panel';
import type { ChatStorage, IRenderMessage, ICommonRenderMessage } from '../chat-box/chat';
import { MessageState, richContentToPlainText } from '../chat-box/chat';
import type { RichTextItem, TextMessage } from '../chat-box/chat';

import KCuteTextarea from '@/components/k-cute-textarea/index.vue';
import { ElMessage } from 'element-plus';
import RichCardPromptPopoverContent from './rich-card-prompt-popover-content.vue';
import RichCardResource from './rich-card-resource.vue';

import { useI18n } from 'vue-i18n';
import { v4 as uuidv4 } from 'uuid';

const { t } = useI18n();

const props = defineProps({
    message: {
        type: Object as PropType<IRenderMessage>,
        required: true
    },
    tabId: {
        type: Number,
        required: true
    }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as ChatStorage;
const isEditing = ref(false);

const hasRichContent = computed(() => {
    const msg = props.message as ICommonRenderMessage;
    return !!msg.richContent && msg.richContent.length > 0;
});

const hasSkillContext = computed(() => {
    const msg = props.message as ICommonRenderMessage;
    return !!(msg.extraInfo as any)?.hasSkillContext;
});
const richContentItems = computed(() => {
    const msg = props.message as ICommonRenderMessage;
    return msg.richContent || [];
});
const userInput = ref('');

const chatContext = inject('chatContext') as any;

// 在setup顶层获取并行模式相关的注入值
const chatMode = inject('chatMode') as Ref<string>;
const parallelChats = inject('parallelChats') as Ref<any[]>;
const updateChatRenderMessages = inject('updateChatRenderMessages') as any;

/** 更新当前消息中指定下标的 richContent 项，并同步 content；兼容单聊与并行聊天的 storage */
function updateRichContentItem(itemIndex: number, newItem: RichTextItem) {
    const msg = props.message as ICommonRenderMessage;
    if (!msg.richContent || itemIndex < 0 || itemIndex >= msg.richContent.length) return;

    if (chatMode.value === 'parallel-chat' && parallelChats?.value?.length) {
        const serverName = msg.extraInfo?.serverName;
        const chat = parallelChats.value.find((c: any) => c.modelId === serverName);
        if (chat) {
            const msgIndex = chat.messages.findIndex((m: any) => m.extraInfo === msg.extraInfo);
            if (msgIndex !== -1) {
                const m = chat.messages[msgIndex] as TextMessage;
                m.richContent = m.richContent || [];
                m.richContent[itemIndex] = newItem;
                m.content = richContentToPlainText(m.richContent);
                if (updateChatRenderMessages) updateChatRenderMessages(chat);
                tabStorage.parallelChats = parallelChats.value.map((c: any) => ({ modelId: c.modelId, messages: c.messages }));
            }
        }
    } else {
        const msgIndex = tabStorage.messages.findIndex((m: any) => m.extraInfo === msg.extraInfo);
        if (msgIndex !== -1) {
            const m = tabStorage.messages[msgIndex] as TextMessage;
            m.richContent = m.richContent || [];
            m.richContent[itemIndex] = newItem;
            m.content = richContentToPlainText(m.richContent);
        }
    }
}

const toggleEdit = () => {
    isEditing.value = !isEditing.value;
    if (isEditing.value) {
        userInput.value = props.message.content;
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    console.log(chatContext);
    
    if (chatMode.value === 'parallel-chat' && parallelChats?.value?.length > 0) {
        // 并行模式：只编辑当前消息所属的聊天实例
        const messageServerName = props.message.extraInfo.serverName;
        
        // 找到对应的聊天实例
        const targetChat = parallelChats.value.find((chat: any) => chat.modelId === messageServerName);
        
        if (targetChat) {
            const index = targetChat.messages.findIndex((msg: any) => msg.extraInfo === props.message.extraInfo);
            if (index !== -1) {
                // 把 index 之后的全部删除（包括 index）
                targetChat.messages.splice(index);
                
                // 重新计算渲染消息
                if (updateChatRenderMessages) {
                    updateChatRenderMessages(targetChat);
                }
            }
            
            // 更新存储
            if (tabStorage.parallelChats) {
                tabStorage.parallelChats = parallelChats.value.map((chat: any) => ({
                    modelId: chat.modelId,
                    messages: chat.messages
                }));
            }
            
            // 只对这个特定的聊天实例重新发送消息
            retrySingleChat(targetChat, userInput.value);
            isEditing.value = false;
        }
    } else {
        // 单聊天模式：清理主消息列表
        const index = tabStorage.messages.findIndex(msg => msg.extraInfo === props.message.extraInfo);
        if (index !== -1) {
            // 把 index 之后的全部删除（包括 index）
            tabStorage.messages.splice(index);
        }
        
        if (chatContext.handleSend) {
            chatContext.handleSend(userInput.value);
            isEditing.value = false;
        }
    }
};

const copy = async () => {
    try {        
        await navigator.clipboard.writeText(props.message.content.trim());
        ElMessage.success('内容已复制到剪贴板');
    } catch (err) {
        console.error('无法复制内容: ', err);
        ElMessage.error('复制失败，请手动复制');
    }
};

// 单个聊天实例重试函数（保留 richContent 以便重新回答后仍以卡片展示 prompt/资源）
const retrySingleChat = async (chat: any, userMessage: string, richContent?: import('../chat-box/chat').RichTextItem[]) => {
    console.log('开始单实例重试，聊天实例:', chat.modelId);
    console.log('重试消息:', userMessage);
    
    // 添加用户消息到这个聊天实例（含富文本）
    chat.messages.push({
        role: 'user',
        content: userMessage,
        ...(richContent && richContent.length > 0 && { richContent }),
        extraInfo: {
            created: Date.now(),
            state: MessageState.Success,
            serverName: chat.modelId,
            enableXmlWrapper: tabStorage.settings.enableXmlWrapper
        }
    });

    // 设置这个聊天实例为加载中
    chat.isLoading = true;
    chat.streamingContent = '';

    console.log('设置聊天实例为加载中:', chat.modelId);

    // 立即更新渲染消息以显示用户输入
    if (updateChatRenderMessages) {
        await updateChatRenderMessages(chat);
    }

    // 导入需要的依赖
    const { TaskLoop } = await import('../core/task-loop');
    const { llmManager, llms } = await import('@/views/setting/llm');
    
    // 创建独立的TaskLoop
    const chatLoop = new TaskLoop();
    
    // 为这个聊天实例创建临时存储
    const chatStorage = {
        id: uuidv4(),
        messages: chat.messages,
        settings: { ...tabStorage.settings }
    };
    
    // 临时改变当前模型为这个聊天实例的模型
    const originalModelIndex = llmManager.currentModelIndex;
    const targetModelIndex = parseInt(chat.modelId);
    
    if (!isNaN(targetModelIndex) && targetModelIndex >= 0 && targetModelIndex < llms.length) {
        llmManager.currentModelIndex = targetModelIndex;
    }

    // 绑定流式输出到这个聊天实例
    const chatStreamingContent = ref('');
    const chatStreamingToolCalls = ref([]);
    chatLoop.bindStreaming(chatStreamingContent, chatStreamingToolCalls);

    // 监听流式内容变化
    const stopWatchStreaming = watch(chatStreamingContent, (newContent) => {
        chat.streamingContent = newContent;
    });

    chatLoop.registerOnError((error: any) => {
        chat.messages.push({
            role: 'assistant',
            content: error.msg,
            extraInfo: {
                created: Date.now(),
                state: error.state,
                serverName: chat.modelId,
                enableXmlWrapper: false
            }
        });
        
        // 重新计算渲染消息
        updateChatRenderMessages(chat);
    });

    chatLoop.registerOnDone(() => {
        chat.isLoading = false;
        chat.streamingContent = '';
        stopWatchStreaming();
    });

    try {
        // 使用特殊标记来表示不需要添加用户消息，因为我们已经手动添加了
        await chatLoop.start(chatStorage, '__SKIP_USER_MESSAGE__');
        
        // 恢复原始模型
        llmManager.currentModelIndex = originalModelIndex;
        
        // 更新存储中的消息
        chat.messages = chatStorage.messages;
        
        // 重新计算渲染消息
        await updateChatRenderMessages(chat);
        
    } catch (error) {
        console.error(`重试聊天 ${chat.modelId} 出错:`, error);
        chat.isLoading = false;
        chat.streamingContent = '';
        stopWatchStreaming();
        llmManager.currentModelIndex = originalModelIndex;
    }
};

const reload = async () => {
    console.log('重试按钮被点击');
    console.log('并行模式:', chatMode.value);
    console.log('并行聊天数量:', parallelChats?.value?.length);
    console.log('消息信息:', props.message);
    
    if (chatMode.value === 'parallel-chat' && parallelChats?.value?.length > 0) {
        // 并行模式：只重试当前消息所属的聊天实例
        const messageServerName = props.message.extraInfo.serverName;
        console.log('消息所属服务器:', messageServerName);
        console.log('可用的聊天实例:', parallelChats.value.map((chat: any) => chat.modelId));
        
        // 找到对应的聊天实例
        const targetChat = parallelChats.value.find((chat: any) => chat.modelId === messageServerName);
        
        console.log('找到的目标聊天实例:', targetChat);
        
        if (targetChat) {
            const index = targetChat.messages.findIndex((msg: any) => msg.extraInfo === props.message.extraInfo);
            console.log('消息在目标聊天实例中的索引:', index);
            
            if (index !== -1) {
                // 把 index 之后的全部删除（包括 index）
                targetChat.messages.splice(index);
                
                // 重新计算渲染消息
                if (updateChatRenderMessages) {
                    await updateChatRenderMessages(targetChat);
                }
            }
            
            // 更新存储
            if (tabStorage.parallelChats) {
                tabStorage.parallelChats = parallelChats.value.map((chat: any) => ({
                    modelId: chat.modelId,
                    messages: chat.messages
                }));
            }
            
            console.log('调用单实例重试');
            // 只对这个特定的聊天实例重新发送消息（保留富文本以便仍以卡片展示）
            const richContent = (props.message as ICommonRenderMessage).richContent;
            retrySingleChat(targetChat, props.message.content, richContent?.length ? richContent : undefined);
        } else {
            console.log('未找到目标聊天实例，不执行重试');
            console.error('无法找到匹配的聊天实例进行重试');
            ElMessage.error('无法找到对应的聊天实例进行重试');
        }
    } else {
        console.log('单聊天模式，使用原有逻辑');
        // 单聊天模式：清理主消息列表
        const index = tabStorage.messages.findIndex(msg => msg.extraInfo === props.message.extraInfo);
        if (index !== -1) {
            // 把 index 之后的全部删除（包括 index）
            tabStorage.messages.splice(index);
        }
        
        if (chatContext.handleSend) {
            const richContent = (props.message as ICommonRenderMessage).richContent;
            chatContext.handleSend(props.message.content, richContent?.length ? richContent : undefined);
        }
    }
};

</script>

<style>

.message-text {
    position: relative;
}

.message-body {
    display: flex;
    align-items: center;
    gap: 8px;
}

.user .message-body .skill-context-badge {
    flex-shrink: 0;
    padding: 3px 6px;
    font-size: 9px;
    font-weight: 600;
    color: var(--main-light-color-70);
    background: var(--main-light-color-20);
    border: 1px solid var(--main-light-color-50);
    border-radius: 4px;
}

.message-text:hover .message-actions {
    opacity: 1;
}

.message-actions {
    opacity: 0;
    transition: var(--animation-3s);
    position: absolute;
    bottom: -34px;
    right: 0;
    z-index: 100;
}

.message-actions .el-button:not(.el-button--primary) {
    border-radius: 8px !important;
    padding: 5px 10px !important;
    height: fit-content !important;
    background-color: var(--foreground) !important;
    color: var(--background) !important;
    border-color: var(--foreground) !important;
    opacity: 0.7;
}

.message-actions .el-button:not(.el-button--primary):hover {
    background-color: var(--foreground) !important;
    color: var(--background) !important;
    opacity: 0.9;
}

.message-actions .el-button+.el-button {
    margin-left: 10px;
}

.user .message-content {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
}

.user .message-content > span {
    max-width: calc(100% - 48px);
    border-radius: 6px;
    background-color: var(--el-input-bg-color, var(--el-fill-color-blank));
    padding: 8px 12px;
    border: 1px solid var(--sidebar-item-border);
    box-sizing: border-box;
    white-space: pre-wrap;
    word-break: break-word;
    text-align: left;
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 6px;
}

/* 与输入框、RichCardPrompt 一致的 prompt 卡片样式（含 pointer 光标、点击即弹窗） */
.user .rich-card-prompt {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    border-radius: 0.3em;
    font-size: var(--chat-font-size-sm, 13px);
    margin: 0 2px;
    user-select: none;
    cursor: pointer;
    background-color: #373839;
    border: 1px solid var(--foreground);
    max-width: 120px;
}
.user .rich-card-prompt .iconfont {
    margin-right: 4px;
    flex-shrink: 0;
}
.user .rich-card-prompt__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.message-plain-text {
    white-space: pre-wrap;
    word-break: break-word;
}

</style>