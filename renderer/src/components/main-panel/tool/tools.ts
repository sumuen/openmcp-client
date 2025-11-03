import type { ToolCallResponse } from '@/hook/type';
import type { Edge, Node, NodeDataView } from './flow/diagram';

export interface TestCase {
    id: string;
    name: string;
    toolName: string;
    description?: string;
    input: Record<string, any>;
    expectedOutput?: ToolCallResponse;
    actualOutput?: ToolCallResponse;
    status?: 'pending' | 'passed' | 'failed' | 'running';
    createdAt: number;
    updatedAt: number;
}

export interface ToolStorage {
    activeNames: any[];
    currentToolName: string;
    lastToolCallResponse?: ToolCallResponse | string;
    formData: Record<string, any>;
    testCases: TestCase[];
    // 控制测试用例面板是否仅展示当前工具的用例
    showOnlyCurrentToolTestCases?: boolean;
    // 变量提取规则，按工具名进行存储：toolName -> 规则文本（每行一个：JSONPath 变量名）
    variableExtractionRules?: Record<string, string>;
    // 变量提取规则（结构化），按工具名进行存储：toolName -> [{ path, name }]
    variableExtractionList?: Record<string, Array<{ path: string; name: string }>>;
    autoDetectDiagram?: {
        edges?: Edge[];
        views?: NodeDataView[];
        [key: string]: any;
    };
}
