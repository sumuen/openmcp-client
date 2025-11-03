/**
 * 参数变量管理 - 类型定义
 * 用于保存和管理 MCP Tool 的测试参数
 */

/**
 * 参数值类型
 */
export type VariableValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

/**
 * 参数变量定义
 */
export interface ToolVariable {
    /** 唯一标识 */
    id: string;
    
    /** 变量名称 */
    name: string;
    
    /** 变量描述 */
    description?: string;
    
    /** 参数类型 */
    type: VariableValueType;
    
    /** 参数值（存储为 JSON 字符串以支持所有类型） */
    value: string;
    
    
    /** 关联的参数名称（可选，表示这个变量对应工具的哪个参数） */
    parameterName?: string;
    
    /** 创建时间 */
    createdAt: number;
    
    /** 最后修改时间 */
    updatedAt: number;
    
    /** 标签（用于分类和搜索） */
    tags?: string[];
    
}


/**
 * 变量管理存储结构
 */
export interface VariableManagementStorage {
    /** 所有变量的映射表 */
    variables: Record<string, ToolVariable>;
    
    
    /** 当前选中的变量 ID */
    selectedVariableId?: string;
    
    
    /** 搜索关键词 */
    searchKeyword?: string;
    
    /** 过滤的工具名称 */
    filterToolName?: string;
}

/**
 * 变量应用到表单的配置
 */
export interface ApplyVariableConfig {
    /** 目标工具名称 */
    toolName: string;
    
    /** 参数映射：工具参数名 -> 变量 ID */
    parameterMapping: Record<string, string>;
}

/**
 * 变量导入导出格式
 */
export interface VariableExportData {
    /** 版本号 */
    version: string;
    
    /** 导出时间 */
    exportedAt: number;
    
    /** 变量列表 */
    variables: ToolVariable[];
}

/**
 * 变量过滤选项
 */
export interface VariableFilterOptions {
    
    /** 按参数名称过滤 */
    parameterName?: string;
    
    /** 按类型过滤 */
    type?: VariableValueType;
    
    /** 按标签过滤 */
    tags?: string[];
    
    /** 搜索关键词（在名称和描述中搜索） */
    keyword?: string;
}
