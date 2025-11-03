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
    autoDetectDiagram?: {
        edges?: Edge[];
        views?: NodeDataView[];
        [key: string]: any;
    };
}
