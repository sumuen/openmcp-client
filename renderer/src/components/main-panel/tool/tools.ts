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
    autoDetectDiagram?: {
        edges?: Edge[];
        views?: NodeDataView[];
        [key: string]: any;
    };
}
