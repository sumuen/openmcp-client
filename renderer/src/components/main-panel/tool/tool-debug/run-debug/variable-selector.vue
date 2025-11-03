<template>
    <el-popover
        placement="bottom-start"
        :width="400"
        trigger="click"
        v-model:visible="visible"
    >
        <template #reference>
            <el-button size="small" :disabled="disabled">
                <span class="iconfont icon-variable"></span>
                {{ buttonText }}
            </el-button>
        </template>

        <div class="variable-selector">
            <!-- 搜索框 -->
            <el-input
                v-model="searchKeyword"
                placeholder="搜索变量..."
                clearable
                size="small"
                style="margin-bottom: 10px;"
            >
                <template #prefix>
                    <span class="iconfont icon-search"></span>
                </template>
            </el-input>

            <!-- 变量列表 -->
            <div class="variable-list-container">
                <el-empty v-if="filteredVariables.length === 0" description="暂无变量" :image-size="60" />

                <div
                    v-for="variable in filteredVariables"
                    :key="variable.id"
                    class="variable-item"
                    :class="{ selected: selectedVariableId === variable.id }"
                    @click="selectVariable(variable)"
                >
                    <div class="variable-item-header">
                        <el-tag :type="getTypeColor(variable.type)" size="small">
                            {{ variable.type }}
                        </el-tag>
                        <span class="variable-item-name">{{ variable.name }}</span>     
                   </div>

                    <div v-if="variable.description" class="variable-item-description">
                        {{ variable.description }}
                    </div>

                    <div class="variable-item-preview">
                        <pre>{{ formatValuePreview(variable) }}</pre>
                    </div>

                    <div class="variable-item-meta">
                        <span v-if="variable.parameterName" style="margin-left: 8px;">
                            参数: {{ variable.parameterName }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- 底部操作 -->
            <div class="variable-selector-footer">
                <el-button size="small" @click="handleManageVariables">
                    管理变量
                </el-button>
                <div style="flex: 1;"></div>
                <el-button size="small" @click="visible = false">取消</el-button>
                <el-button
                    size="small"
                    type="primary"
                    :disabled="!selectedVariableId"
                    @click="handleApply"
                >
                    应用
                </el-button>
            </div>
        </div>
    </el-popover>
</template>

<script setup lang="ts">
import { defineComponent, ref, computed, defineProps, defineEmits, watch, onMounted } from 'vue';
import type { ToolVariable, VariableValueType } from '../../variable-management/types';
import { getVariables, getVariableValue, initVariableStore } from '../../variable-management/store';
import { mcpClientAdapter } from '@/views/connect/core';
import { ElMessage } from 'element-plus';

defineComponent({ name: 'variable-selector' });

const props = defineProps({
    /** 按钮文本 */
    buttonText: {
        type: String,
        default: '选择变量'
    },
    /** 当前工具名称（用于过滤） */
    toolName: {
        type: String,
        default: ''
    },
    /** 当前参数名称（用于过滤） */
    parameterName: {
        type: String,
        default: ''
    },
    /** 期望的变量类型（用于过滤） */
    expectedType: {
        type: String as () => VariableValueType | undefined,
        default: undefined
    },
    /** 是否禁用 */
    disabled: {
        type: Boolean,
        default: false
    }
});

const emits = defineEmits<{
    /** 选择变量后触发 */
    select: [variable: ToolVariable, value: any]
}>();

// 状态
const visible = ref(false);
const searchKeyword = ref('');
const selectedVariableId = ref<string>();

// 计算属性
const filteredVariables = computed(() => {
    let variables = getVariables({
        keyword: searchKeyword.value,
        type: props.expectedType
    });

    // 优先显示匹配当前参数的变量
    if (props.parameterName) {
        variables.sort((a, b) => {
            const aMatch = a.parameterName === props.parameterName ? 1 : 0;
            const bMatch = b.parameterName === props.parameterName ? 1 : 0;
            return bMatch - aMatch;
        });
    }

    return variables;
});

// 方法
function selectVariable(variable: ToolVariable) {
    selectedVariableId.value = variable.id;
}

function handleApply() {
    if (!selectedVariableId.value) return;

    const variables = getVariables();
    const variable = variables.find(v => v.id === selectedVariableId.value);
    
    if (variable) {
        const value = getVariableValue(variable.id);
        emits('select', variable, value);
        ElMessage.success(`已应用变量: ${variable.name}`);
        visible.value = false;
        selectedVariableId.value = undefined;
    }
}

function handleManageVariables() {
    // 触发打开变量管理页面
    // 这里可以通过路由或者事件总线来实现
    window.dispatchEvent(new Event('open-variable-management'));
    visible.value = false;
}

function formatValuePreview(variable: ToolVariable): string {
    const raw = getVariableValue(variable.id);
    try {
        // 保证对象/数组为紧凑预览
        const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
        return str.length > 80 ? str.substring(0, 80) + '…' : str;
    } catch {
        const s = String(raw);
        return s.length > 80 ? s.substring(0, 80) + '…' : s;
    }
}

function getTypeColor(type: VariableValueType): '' | 'primary' | 'success' | 'info' | 'warning' | 'danger' {
    const colorMap: Record<VariableValueType, '' | 'primary' | 'success' | 'info' | 'warning' | 'danger'> = {
        string: 'primary',
        number: 'success',
        boolean: 'warning',
        object: 'info',
        array: 'info',
        null: 'danger'
    };
    return colorMap[type] || 'info';
}

// 监听可见性变化，重置选择
watch(visible, (newVal) => {
    if (!newVal) {
        selectedVariableId.value = undefined;
    }
});

// 确保变量存储已绑定到主客户端，避免出现值为空或不同步
onMounted(() => {
    try { initVariableStore(mcpClientAdapter.masterNode); } catch {}
});
</script>

<style scoped>
.variable-selector {
    display: flex;
    flex-direction: column;
    max-height: 500px;
}

.filters {
    display: flex;
    gap: 10px;
}

.variable-list-container {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 10px;
    max-height: 350px;
}

.variable-item {
    padding: 10px;
    margin-bottom: 8px;
    border: 1px solid var(--main-color, #409eff);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--background, #1e1e1e);
    color: var(--font-color, #e5e5e5);
}

.variable-item:hover {
    background-color: rgba(64, 158, 255, 0.12);
    border-color: var(--main-color, #409eff);
}

.variable-item.selected {
    background-color: rgba(64, 158, 255, 0.2);
    border-color: var(--main-color, #409eff);
}

.variable-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
}

.variable-item-name {
    font-weight: bold;
    font-size: 13px;
    flex: 1;
}

.variable-item-description {
    font-size: 12px;
    color: #666;
    margin-bottom: 5px;
}

.variable-item-preview {
    background: var(--sidebar, #2a2a2a);
    padding: 6px 8px;
    border-radius: 4px;
    margin-bottom: 6px;
    color: var(--font-color, #e5e5e5);
}

.variable-item-preview pre {
    margin: 0;
    font-size: 11px;
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
    word-break: break-all;
}

.variable-item-meta {
    font-size: 11px;
    color: #999;
}

.variable-selector-footer {
    display: flex;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid var(--main-color, #409eff);
}

/* 弹层整体暗色适配 */
:deep(.el-popover) {
    background: var(--background, #1e1e1e);
    color: var(--font-color, #e5e5e5);
    border-color: var(--main-color, #409eff);
}

:deep(.el-input__wrapper), :deep(.el-input__inner) {
    background: var(--sidebar, #2a2a2a);
    color: var(--font-color, #e5e5e5);
}

:deep(.el-button) {
    color: var(--font-color, #e5e5e5);
}

/* Tag 可读性增强（暗色主题） */
:deep(.el-tag) {
    color: #ffffff !important;
    border: none !important;
}

:deep(.el-tag.el-tag--primary) {
    background-color: #409eff !important;
}

:deep(.el-tag.el-tag--success) {
    background-color: #67c23a !important;
}

:deep(.el-tag.el-tag--warning) {
    background-color: #e6a23c !important;
}

:deep(.el-tag.el-tag--danger) {
    background-color: #f56c6c !important;
}

:deep(.el-tag.el-tag--info) {
    background-color: #909399 !important;
}
</style>
