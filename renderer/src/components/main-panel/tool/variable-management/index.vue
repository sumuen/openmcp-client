<template>
    <div class="variable-management">
        <!-- 顶部操作栏 -->
        <div class="toolbar">
            <el-input
                v-model="searchKeyword"
                placeholder="搜索变量..."
                clearable
                style="width: 250px; margin-right: 10px;"
                @input="handleSearch"
            >
                <template #prefix>
                    <span class="iconfont icon-search"></span>
                </template>
            </el-input>


            <el-button type="primary" @click="showCreateDialog = true">
                <span class="iconfont icon-add"></span>
                新建变量
            </el-button>

            <el-button @click="showImportDialog = true">
                <span class="iconfont icon-upload"></span>
                导入
            </el-button>

            <el-button @click="handleExport">
                <span class="iconfont icon-download"></span>
                导出
            </el-button>

            <el-button @click="handleClearAll" type="danger" plain>
                清空
            </el-button>
        </div>

        <!-- 统计信息 -->
        <div class="statistics">
            <el-tag>总计: {{ totalCount }} 个变量</el-tag>
        </div>

        <!-- 变量列表 -->
        <div class="variable-list">
            <el-empty v-if="filteredVariables.length === 0" description="暂无变量" />

            <el-card
                v-for="variable in filteredVariables"
                :key="variable.id"
                class="variable-card"
                :class="{ selected: variable.id === selectedVariableId }"
                @click="selectVariable(variable.id)"
            >
                <template #header>
                    <div class="variable-card-header">
                        <div class="variable-info">
                            <el-tag :type="getTypeColor(variable.type)" size="small">
                                {{ variable.type }}
                            </el-tag>
                            <span class="variable-name">{{ variable.name }}</span>
                        </div>
                        <div class="variable-actions">
                            <el-button
                                size="small"
                                type="primary"
                                text
                                @click.stop="handleEdit(variable)"
                            >
                                编辑
                            </el-button>
                            <el-button
                                size="small"
                                type="primary"
                                text
                                @click.stop="handleCopy(variable)"
                            >
                                复制
                            </el-button>
                            <el-button
                                size="small"
                                type="danger"
                                text
                                @click.stop="handleDelete(variable.id)"
                            >
                                删除
                            </el-button>
                        </div>
                    </div>
                </template>

                <div class="variable-content">
                    <div v-if="variable.description" class="variable-description">
                        {{ variable.description }}
                    </div>

                    <div class="variable-metadata">
                        <el-tag v-if="variable.parameterName" size="small" type="info" style="margin-left: 5px;">
                            参数: {{ variable.parameterName }}
                        </el-tag>
                    </div>

                    <div class="variable-value">
                        <strong>值:</strong>
                        <pre>{{ formatValue(variable.value) }}</pre>
                    </div>

                    <div v-if="variable.tags && variable.tags.length > 0" class="variable-tags">
                        <el-tag
                            v-for="tag in variable.tags"
                            :key="tag"
                            size="small"
                            style="margin-right: 5px;"
                        >
                            {{ tag }}
                        </el-tag>
                    </div>

                    <div class="variable-time">
                        <span>创建: {{ formatTime(variable.createdAt) }}</span>
                        <span style="margin-left: 15px;">更新: {{ formatTime(variable.updatedAt) }}</span>
                    </div>
                </div>
            </el-card>
        </div>

        <!-- 创建/编辑变量对话框 -->
        <el-dialog
            v-model="showCreateDialog"
            :title="editingVariable ? '编辑变量' : '创建变量'"
            width="600px"
        >
            <el-form :model="formData" label-width="100px" ref="formRef">
                <el-form-item label="变量名称" required>
                    <el-input v-model="formData.name" placeholder="例如: user_id" />
                </el-form-item>

                <el-form-item label="变量类型" required>
                    <el-select v-model="formData.type" style="width: 100%;">
                        <el-option label="字符串 (string)" value="string" />
                        <el-option label="数字 (number)" value="number" />
                        <el-option label="布尔值 (boolean)" value="boolean" />
                        <el-option label="对象 (object)" value="object" />
                        <el-option label="数组 (array)" value="array" />
                        <el-option label="空值 (null)" value="null" />
                    </el-select>
                </el-form-item>

                <el-form-item label="变量值" required>
                    <el-input
                        v-if="formData.type === 'string'"
                        v-model="formData.value"
                        type="textarea"
                        :rows="3"
                        placeholder="输入字符串值"
                    />
                    <el-input-number
                        v-else-if="formData.type === 'number'"
                        v-model="formData.value"
                        style="width: 100%;"
                        placeholder="输入数字值"
                    />
                    <el-switch
                        v-else-if="formData.type === 'boolean'"
                        v-model="formData.value"
                        active-text="true"
                        inactive-text="false"
                    />
                    <el-input
                        v-else
                        v-model="formData.value"
                        type="textarea"
                        :rows="5"
                        placeholder="输入 JSON 格式的值"
                    />
                </el-form-item>

                <el-form-item label="描述">
                    <el-input
                        v-model="formData.description"
                        type="textarea"
                        :rows="2"
                        placeholder="变量的用途说明（可选）"
                    />
                </el-form-item>

                <el-form-item label="标签">
                    <el-select
                        v-model="formData.tags"
                        multiple
                        filterable
                        allow-create
                        default-first-option
                        style="width: 100%;"
                        placeholder="添加标签（可选）"
                    />
                </el-form-item>

            </el-form>

            <template #footer>
                <el-button @click="showCreateDialog = false">取消</el-button>
                <el-button type="primary" @click="handleSaveVariable">确定</el-button>
            </template>
        </el-dialog>

        <!-- 导入对话框 -->
        <el-dialog v-model="showImportDialog" title="导入变量" width="500px">
            <el-upload
                drag
                :auto-upload="false"
                :on-change="handleFileChange"
                :show-file-list="false"
                accept=".json"
            >
                <span class="iconfont icon-upload" style="font-size: 50px;"></span>
                <div class="el-upload__text">
                    将 JSON 文件拖到此处，或<em>点击上传</em>
                </div>
            </el-upload>

            <el-checkbox v-model="importMerge" style="margin-top: 15px;">
                合并到现有变量（不勾选则清空后导入）
            </el-checkbox>

            <template #footer>
                <el-button @click="showImportDialog = false">取消</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { ToolVariable, VariableValueType } from './types';
import {
    initVariableStore,
    variableUIState,
    createVariable,
    updateVariable,
    deleteVariable,
    getVariables,
    exportVariables,
    importVariables,
    clearAllVariables,
    searchVariables
} from './store';
import { mcpClientAdapter } from '@/views/connect/core';

defineComponent({ name: 'variable-management' });

// 获取主 MCP 客户端（server 级别）
const masterClient = mcpClientAdapter.masterNode;

// 初始化变量管理（绑定到 server）
initVariableStore(masterClient);

// 搜索和过滤
const searchKeyword = ref('');
const selectedVariableId = computed(() => variableUIState.value.selectedVariableId);

// 对话框状态
const showCreateDialog = ref(false);
const showImportDialog = ref(false);
const editingVariable = ref<ToolVariable | null>(null);

// 表单数据
const formData = ref({
    name: '',
    type: 'string' as VariableValueType,
    value: '' as any,
    description: '',
    parameterName: '',
    tags: [] as string[],
});

const formRef = ref();
const importMerge = ref(true);


const filteredVariables = computed(() => {
    return getVariables({
        keyword: searchKeyword.value,    });
});

const totalCount = computed(() => getVariables().length);

// 方法
function handleSearch() {
    searchVariables(searchKeyword.value);
}

function selectVariable(id: string) {
    variableUIState.value.selectedVariableId = id;
}

function handleEdit(variable: ToolVariable) {
    editingVariable.value = variable;
    formData.value = {
        name: variable.name,
        type: variable.type,
        value: JSON.parse(variable.value),
        description: variable.description || '',
        parameterName: variable.parameterName || '',
        tags: variable.tags || [],
    };
    showCreateDialog.value = true;
}

function handleCopy(variable: ToolVariable) {
    const value = formatValue(variable.value);
    navigator.clipboard.writeText(value).then(() => {
        ElMessage.success('已复制到剪贴板');
    });
}

function handleDelete(id: string) {
    ElMessageBox.confirm('确定要删除这个变量吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        if (deleteVariable(id)) {
            ElMessage.success('删除成功');
        }
    });
}

function handleSaveVariable() {
    if (!formData.value.name) {
        ElMessage.error('请输入变量名称');
        return;
    }

    let value = formData.value.value;
    
    // 对于非基本类型，验证 JSON 格式
    if (['object', 'array'].includes(formData.value.type)) {
        try {
            if (typeof value === 'string') {
                JSON.parse(value);
            }
        } catch {
            ElMessage.error('请输入有效的 JSON 格式');
            return;
        }
    }

    if (editingVariable.value) {
        // 编辑模式
        updateVariable(editingVariable.value.id, {
            name: formData.value.name,
            type: formData.value.type,
            value: JSON.stringify(value),
            description: formData.value.description,
            parameterName: formData.value.parameterName || undefined,
            tags: formData.value.tags,
        });
        ElMessage.success('变量已更新');
    } else {
        // 创建模式
        createVariable(
            formData.value.name,
            formData.value.type,
            value,
            {
                description: formData.value.description,
                parameterName: formData.value.parameterName || undefined,
                tags: formData.value.tags,
            }
        );
        ElMessage.success('变量已创建');
    }

    showCreateDialog.value = false;
    resetForm();
}

function resetForm() {
    editingVariable.value = null;
    formData.value = {
        name: '',
        type: 'string',
        value: '',
        description: '',
        parameterName: '',
        tags: [],
    };
}

function handleExport() {
    const data = exportVariables();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variables_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
}

function handleFileChange(file: any) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target?.result as string);
            importVariables(data, importMerge.value);
            showImportDialog.value = false;
        } catch (error) {
            ElMessage.error('导入失败：JSON 格式错误');
        }
    };
    reader.readAsText(file.raw);
}

function handleClearAll() {
    ElMessageBox.confirm('确定要清空所有变量吗？此操作不可恢复！', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
    }).then(() => {
        clearAllVariables();
        ElMessage.success('已清空所有变量');
    });
}

function formatValue(value: string): string {
    try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return value;
    }
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
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

// 生命周期已在前面处理（initVariableStore）
</script>

<style scoped>
.variable-management {
    padding: 20px;
    height: 100%;
    overflow: auto;
}

.toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
}

.statistics {
    margin-bottom: 20px;
    color: #f5f7fa;
}

.statistics .el-tag {
    color: #ffffff !important;
}

.variable-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 15px;
}

.variable-card {
    cursor: pointer;
    transition: all 0.3s;
}

.variable-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
}

.variable-card.selected {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 10px rgba(64, 158, 255, 0.3);
}

.variable-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.variable-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.variable-name {
    font-weight: bold;
    font-size: 14px;
}

.variable-actions {
    display: flex;
    gap: 5px;
}

.variable-content {
    font-size: 12px;
}

.variable-description {
    color: #666;
    margin-bottom: 10px;
    line-height: 1.5;
}

.variable-metadata {
    margin-bottom: 10px;
}

.variable-value {
    background: #f5f7fa;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 10px;
}

.variable-value pre {
    margin: 5px 0 0;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: 'Courier New', monospace;
    font-size: 11px;
}

.variable-tags {
    margin-bottom: 10px;
}

.variable-time {
    color: #999;
    font-size: 11px;
}
</style>