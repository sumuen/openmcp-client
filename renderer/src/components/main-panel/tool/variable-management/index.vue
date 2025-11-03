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

            <el-table
                v-else
                :data="filteredVariables"
                style="width: 100%"
                @row-click="selectVariable"
                :row-class-name="getRowClassName"
                max-height="calc(100vh - 250px)"
            >
                <el-table-column label="类型" width="90">
                    <template #default="{ row }">
                        <el-tag :type="getTypeColor(row.type)" size="small">
                            {{ row.type }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column prop="name" label="变量名称" show-overflow-tooltip />

                <el-table-column label="值" show-overflow-tooltip>
                    <template #default="{ row }">
                        <div class="value-preview">
                            {{ formatValuePreview(row.value) }}
                        </div>
                    </template>
                </el-table-column>

                <el-table-column prop="description" label="描述" show-overflow-tooltip />

                <el-table-column label="标签">
                    <template #default="{ row }">
                        <span v-if="!row.tags || row.tags.length === 0">-</span>
                        <el-tag
                            v-else
                            v-for="tag in row.tags"
                            :key="tag"
                            size="small"
                            style="margin-right: 5px;"
                        >
                            {{ tag }}
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="更新时间" width="170">
                    <template #default="{ row }">
                        {{ formatTime(row.updatedAt) }}
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="210">
                    <template #default="{ row }">
                        <el-button
                            size="small"
                            type="primary"
                            text
                            @click.stop="handleEdit(row)"
                        >
                            编辑
                        </el-button>
                        <el-button
                            size="small"
                            type="primary"
                            text
                            @click.stop="handleCopy(row)"
                        >
                            复制
                        </el-button>
                        <el-button
                            size="small"
                            type="danger"
                            text
                            @click.stop="handleDelete(row.id)"
                        >
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
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

function handleSearch() {
    searchVariables(searchKeyword.value);
}

function selectVariable(row: ToolVariable) {
    variableUIState.value.selectedVariableId = row.id;
}

function getRowClassName({ row }: { row: ToolVariable }) {
    return row.id === selectedVariableId.value ? 'selected-row' : '';
}

function formatValuePreview(value: string): string {
    try {
        const parsed = JSON.parse(value);
        const str = JSON.stringify(parsed);
        return str.length > 50 ? str.substring(0, 50) + '...' : str;
    } catch {
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
    }
}

function handleEdit(variable: ToolVariable) {
    editingVariable.value = variable;
    // 解析存储值，并根据类型准备表单展示值
    let parsed: any;
    try {
        parsed = JSON.parse(variable.value);
    } catch {
        // 如果解析失败，回退为原始字符串
        parsed = variable.value;
    }

    const isComplex = variable.type === 'object' || variable.type === 'array' || variable.type === 'null';
    const displayValue = isComplex ? JSON.stringify(parsed, null, 2) : parsed;

    formData.value = {
        name: variable.name,
        type: variable.type,
        value: displayValue,
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

    const type = formData.value.type;
    const raw = formData.value.value as any;

    // 计算：
    // - valueForCreate: 传给 createVariable（它内部会 JSON.stringify）
    // - valueForUpdate: 传给 updateVariable（需要预先是字符串）
    let valueForCreate: any = raw;
    let valueForUpdate: string;

    if (['object', 'array', 'null'].includes(type)) {
        // 复杂类型：表单里使用字符串展示，保存时需校验并规范化
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            valueForCreate = parsed;
            valueForUpdate = JSON.stringify(parsed);
        } catch {
            ElMessage.error('请输入有效的 JSON 格式');
            return;
        }
    } else {
        // 基础类型：直接用，更新时转成字符串
        valueForCreate = raw;
        valueForUpdate = JSON.stringify(raw);
    }

    if (editingVariable.value) {
        // 编辑模式
        updateVariable(editingVariable.value.id, {
            name: formData.value.name,
            type: formData.value.type,
            value: valueForUpdate,
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
            valueForCreate,
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
    width: 100%;
}

.value-preview {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

:deep(.el-table__row) {
    cursor: pointer;
}

:deep(.el-table__row:hover) {
    background-color: rgba(64, 158, 255, 0.1) !important;
}

/* 修复类型标签颜色 */
:deep(.el-tag) {
    color: #ffffff !important;
    border: none;
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