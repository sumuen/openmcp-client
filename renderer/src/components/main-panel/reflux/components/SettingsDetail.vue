<template>
    <div class="settings-detail">
        <el-descriptions title="聊天设置" :column="1" border>
            <el-descriptions-item label="模型索引">
                {{ settings.modelIndex !== undefined ? settings.modelIndex : '未设置' }}
            </el-descriptions-item>
            <el-descriptions-item label="系统提示词">
                <div class="system-prompt">{{ settings.systemPrompt || '无' }}</div>
            </el-descriptions-item>
            <el-descriptions-item label="温度">
                {{ settings.temperature }}
            </el-descriptions-item>
            <el-descriptions-item label="上下文长度">
                {{ settings.contextLength }}
            </el-descriptions-item>
            <el-descriptions-item label="网络搜索">
                <el-tag :type="settings.enableWebSearch ? 'success' : 'info'">
                    {{ settings.enableWebSearch ? '启用' : '禁用' }}
                </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="并行工具调用">
                <el-tag :type="settings.parallelToolCalls ? 'success' : 'info'">
                    {{ settings.parallelToolCalls ? '启用' : '禁用' }}
                </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="XML包装">
                <el-tag :type="settings.enableXmlWrapper ? 'success' : 'info'">
                    {{ settings.enableXmlWrapper ? '启用' : '禁用' }}
                </el-tag>
            </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="tools-section">
            <h3>启用的工具</h3>
            <div v-if="settings.enableTools && settings.enableTools.length > 0" class="tools-list">
                <el-table :data="settings.enableTools" style="width: 100%" border>
                    <el-table-column prop="name" label="工具名称" width="180" />
                    <el-table-column prop="description" label="描述" />
                    <el-table-column label="状态" width="100">
                        <template #default="scope">
                            <el-tag :type="scope.row.enabled ? 'success' : 'info'">
                                {{ scope.row.enabled ? '启用' : '禁用' }}
                            </el-tag>
                        </template>
                    </el-table-column>
                </el-table>
            </div>
            <div v-else>
                <el-empty description="没有启用的工具" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ChatSetting } from '../../chat/chat-box/chat';


defineProps<{
    settings: ChatSetting;
}>();
</script>

<style scoped>
.settings-detail {
    padding: 10px 0;
}

.system-prompt {
    white-space: pre-wrap;
    font-family: monospace;
    background-color: var(--el-fill-color-light);
    padding: 10px;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
}

.tools-section {
    margin-top: 20px;
}

.tools-section h3 {
    margin-bottom: 15px;
    color: var(--el-text-color-primary);
}

.tools-list {
    margin-top: 10px;
}
</style>