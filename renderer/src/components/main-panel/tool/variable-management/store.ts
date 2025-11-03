/**
 * 变量管理服务
 * 提供变量的增删改查功能
 * 数据保存在 McpClient.variables 中（server 级别，自动持久化）
 */

import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type {
    ToolVariable,
    VariableFilterOptions,
    VariableExportData,
    ApplyVariableConfig
} from './types';
import { ElMessage } from 'element-plus';
import type { McpClient } from '@/views/connect/core';
import { useMessageBridge } from '@/api/message-bridge';

/**
 * 当前 MCP 客户端的引用（需要从外部注入）
 */
let currentClient: any | null = null;

/**
 * 临时选择状态（不需要持久化）
 */
export const variableUIState = ref({
    selectedVariableId: undefined as string | undefined,
    searchKeyword: '',
    filterToolName: undefined as string | undefined
});

/**
 * 初始化变量管理（绑定到 MCP Client）
 * 必须在使用其他 API 前调用
 */
export function initVariableStore(client: any) {
    currentClient = client;
    
    // 加载该 server 的变量数据
    loadVariables();
}

/**
 * 获取当前的变量存储（内部使用）
 */
function getVariableStorage(): Map<string, ToolVariable> {
    if (!currentClient) {
        throw new Error('Variable store not initialized. Call initVariableStore first.');
    }
    return currentClient.variables as Map<string, ToolVariable>;
}

/**
 * 保存变量到后端
 */
async function saveVariables() {
    if (!currentClient) return;
    
    const bridge = useMessageBridge();
    const variables = Array.from(getVariableStorage().values());
    
    await bridge.commandRequest('variables/save', {
        clientId: currentClient.clientId,
        variables
    });
}

/**
 * 从后端加载变量
 */
async function loadVariables() {
    if (!currentClient) return;
    
    const bridge = useMessageBridge();
    const { code, msg } = await bridge.commandRequest<{ variables: ToolVariable[] }>('variables/load', {
        clientId: currentClient.clientId
    });
    
    if (code === 200 && msg.variables) {
        const storage = getVariableStorage();
        storage.clear();
        msg.variables.forEach(v => storage.set(v.id, v));
    }
}
/**
 * 创建新变量
 */
export function createVariable(
    name: string,
    type: ToolVariable['type'],
    value: any,
    options?: {
        description?: string;
        toolName?: string;
        parameterName?: string;
        tags?: string[];
        isGlobal?: boolean;
    }
): ToolVariable {
    const variables = getVariableStorage();
    const now = Date.now();
    const variable: ToolVariable = {
        id: uuidv4(),
        name,
        type,
        value: JSON.stringify(value),
        description: options?.description,
        parameterName: options?.parameterName,
        tags: options?.tags || [],
        createdAt: now,
        updatedAt: now
    };

    variables.set(variable.id, variable);
    // 保存到后端
    saveVariables();
    
    return variable;
}

/**
 * 更新变量
 */
export function updateVariable(
    id: string,
    updates: Partial<Omit<ToolVariable, 'id' | 'createdAt'>>
): boolean {
    const variables = getVariableStorage();
    const variable = variables.get(id);
    if (!variable) {
        ElMessage.error(`变量不存在: ${id}`);
        return false;
    }

    Object.assign(variable, {
        ...updates,
        updatedAt: Date.now()
    });
    
    variables.set(id, variable);
    // 保存到后端
    saveVariables();
    return true;
}

/**
 * 删除变量
 */
export function deleteVariable(id: string): boolean {
    const variables = getVariableStorage();
    
    if (!variables.has(id)) {
        ElMessage.error(`变量不存在: ${id}`);
        return false;
    }

    variables.delete(id);
    // 保存到后端
    saveVariables();
    return true;
}

/**
 * 获取变量
 */
export function getVariable(id: string): ToolVariable | undefined {
    const variables = getVariableStorage();
    return variables.get(id);
}

/**
 * 获取变量的实际值（解析 JSON）
 */
export function getVariableValue(id: string): any {
    const variables = getVariableStorage();
    const variable = variables.get(id);
    if (!variable) return undefined;

    try {
        return JSON.parse(variable.value);
    } catch {
        return variable.value;
    }
}

/**
 * 获取所有变量（可选过滤）
 */
export function getVariables(filter?: VariableFilterOptions): ToolVariable[] {
    const variables = getVariableStorage();
    let variableList = Array.from(variables.values());

    if (!filter) return variableList;

    if (filter.parameterName) {
        variableList = variableList.filter(v => v.parameterName === filter.parameterName);
    }

    if (filter.type) {
        variableList = variableList.filter(v => v.type === filter.type);
    }

    if (filter.tags && filter.tags.length > 0) {
        variableList = variableList.filter(v => 
            v.tags?.some((tag: string) => filter.tags!.includes(tag))
        );
    }


    if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase();
        variableList = variableList.filter(v => 
            v.name.toLowerCase().includes(keyword) ||
            v.description?.toLowerCase().includes(keyword)
        );
    }

    return variableList;
}

/**
 * 将变量应用到表单
 */
export function applyVariablesToForm(
    formData: Record<string, any>,
    config: ApplyVariableConfig
): Record<string, any> {
    const newFormData = { ...formData };

    for (const [parameterName, variableId] of Object.entries(config.parameterMapping)) {
        const value = getVariableValue(variableId);
        if (value !== undefined) {
            newFormData[parameterName] = value;
        }
    }

    return newFormData;
}

/**
 * 从表单数据快速创建变量
 */
export function createVariablesFromForm(
    toolName: string,
    formData: Record<string, any>,
    inputSchema?: any
): ToolVariable[] {
    const variables: ToolVariable[] = [];

    for (const [parameterName, value] of Object.entries(formData)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }

        const property = inputSchema?.properties?.[parameterName];
        const type = property?.type || typeof value;

        const variable = createVariable(
            `${toolName}_${parameterName}`,
            type as any,
            value,
            {
                description: property?.description || `${toolName} 的 ${parameterName} 参数`,
                toolName,
                parameterName,
                isGlobal: false
            }
        );

        variables.push(variable);
    }

    return variables;
}

/**
 * 导出变量
 */
export function exportVariables(variableIds?: string[]): VariableExportData {
    const variables = getVariableStorage();
    let variableList: ToolVariable[];

    if (variableIds) {
        variableList = variableIds
            .map(id => variables.get(id))
            .filter(Boolean) as ToolVariable[];
    } else {
        variableList = Array.from(variables.values());
    }

    return {
        version: '1.0.0',
        exportedAt: Date.now(),
        variables: variableList,
    };
}

/**
 * 导入变量
 */
export function importVariables(data: VariableExportData, merge = true): void {
    const variables = getVariableStorage();
    
    if (!merge) {
        // 清空现有数据
        variables.clear();
    }

    // 导入变量
    data.variables.forEach(variable => {
        // 如果是合并模式且 ID 冲突，生成新 ID
        if (merge && variables.has(variable.id)) {
            variable.id = uuidv4();
        }
        variables.set(variable.id, variable);
    });
    // 保存到后端
    saveVariables();
    ElMessage.success(`成功导入 ${data.variables.length} 个变量`);
}

/**
 * 搜索变量
 */
export function searchVariables(keyword: string): ToolVariable[] {
    variableUIState.value.searchKeyword = keyword;
    return getVariables({ keyword });
}

/**
 * 清空所有变量
 */
export function clearAllVariables(): void {
    const variables = getVariableStorage();
    variables.clear();
    variableUIState.value.selectedVariableId = undefined;
    // 保存到后端
    saveVariables();
}
