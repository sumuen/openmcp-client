/**
 * 变量选择器组件
 * 用于在工具调试界面快速选择和应用保存的变量
 */

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
                        <pre>{{ formatValuePreview(variable.value) }}</pre>
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
import { defineComponent, ref, computed, defineProps, defineEmits, watch } from 'vue';
import type { ToolVariable, VariableValueType } from './types';
import { getVariables, getVariableValue } from './store';
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
    ElMessage.info('请在工具面板中打开"变量管理"标签页');
    visible.value = false;
}

function formatValuePreview(value: string): string {
    try {
        const parsed = JSON.parse(value);
        const str = JSON.stringify(parsed);
        // 限制预览长度
        return str.length > 50 ? str.substring(0, 50) + '...' : str;
    } catch {
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
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
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
}

.variable-item:hover {
    background-color: #f5f7fa;
    border-color: #409eff;
}

.variable-item.selected {
    background-color: #ecf5ff;
    border-color: #409eff;
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
    background: #f5f7fa;
    padding: 5px;
    border-radius: 3px;
    margin-bottom: 5px;
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
    border-top: 1px solid #e4e7ed;
}
</style>
