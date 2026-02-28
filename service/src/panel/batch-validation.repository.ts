import * as path from 'path';
import * as fs from 'fs';
import { JsonArchiveStore } from '../common/json-archive-store.js';
import { VSCODE_WORKSPACE } from '../hook/setting.js';

/** 将 MCP 服务器名转为安全文件名 */
function escapeServerName(name: string): string {
    return (name || 'default').replace(/[\\/:*?"<>|]/g, '_');
}

/** 与 renderer 侧 BatchValidationStorage 结构一致 */
export interface BatchValidationStorageRow {
    testCases: Array<{
        id: string;
        name?: string;
        description?: string;
        input: string;
        inputRichContent?: Array<{ type: string; text: string; name?: string; args?: Record<string, string> }>;
        criteria: string[];
    }>;
    selectedCaseIndex: number;
    comprehensiveSelectedIndices: number[];
    comprehensivePresets: Array<{ id: string; name: string; indices: number[] }>;
    currentPresetId?: string;
    sourceTabIndex: number;
    evaluationMode: 'pass-fail' | 'score';
    resultGroups: Array<{
        testCaseIndex: number;
        testInput: string;
        inputRichContent?: Array<{ type: string; text: string; name?: string; args?: Record<string, string> }>;
        agentMessages?: any[];
        agentLoopStats?: {
            durationMs: number;
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
            toolCallCount: number;
        };
        criterionResults: Array<{
            testCaseId: string;
            testCaseIndex: number;
            criterionIndex: number;
            testInput: string;
            testCaseCriteria: string;
            rawResponse: string;
            pass?: boolean;
            reason?: string;
            score?: number;
            error?: string;
            evalInputTokens?: number;
            evalOutputTokens?: number;
        }>;
    }>;
}

const ROW_KEY = 'config';
const DEFAULT_STORAGE: BatchValidationStorageRow = {
    testCases: [],
    selectedCaseIndex: 0,
    comprehensiveSelectedIndices: [],
    comprehensivePresets: [],
    sourceTabIndex: 0,
    evaluationMode: 'pass-fail',
    resultGroups: []
};

export class BatchValidationRepository {
    private store: JsonArchiveStore;
    private baseDir: string;

    constructor(serverName: string) {
        const dbDir = path.join(VSCODE_WORKSPACE || process.cwd(), '.openmcp', 'data');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        const safeName = escapeServerName(serverName);
        this.baseDir = path.join(dbDir, `batch-validation-${safeName}`);
        this.store = new JsonArchiveStore(this.baseDir, 'config', { maxSize: '5m', maxFiles: 7 });
    }

    async load(): Promise<BatchValidationStorageRow> {
        try {
            const rec = await this.store.read(ROW_KEY);
            if (!rec || !rec.data) return { ...DEFAULT_STORAGE };
            const parsed = JSON.parse(String(rec.data)) as BatchValidationStorageRow;
            return this.normalizeStorage(parsed);
        } catch {
            return { ...DEFAULT_STORAGE };
        }
    }

    private normalizeStorage(parsed: BatchValidationStorageRow): BatchValidationStorageRow {
        return {
            testCases: Array.isArray(parsed.testCases) ? parsed.testCases : DEFAULT_STORAGE.testCases,
            selectedCaseIndex: typeof parsed.selectedCaseIndex === 'number' ? parsed.selectedCaseIndex : DEFAULT_STORAGE.selectedCaseIndex,
            comprehensiveSelectedIndices: Array.isArray(parsed.comprehensiveSelectedIndices) ? parsed.comprehensiveSelectedIndices : DEFAULT_STORAGE.comprehensiveSelectedIndices,
            comprehensivePresets: Array.isArray(parsed.comprehensivePresets) ? parsed.comprehensivePresets : DEFAULT_STORAGE.comprehensivePresets,
            currentPresetId: typeof parsed.currentPresetId === 'string' ? parsed.currentPresetId : undefined,
            sourceTabIndex: typeof parsed.sourceTabIndex === 'number' ? parsed.sourceTabIndex : DEFAULT_STORAGE.sourceTabIndex,
            evaluationMode: parsed.evaluationMode === 'score' ? 'score' : 'pass-fail',
            resultGroups: Array.isArray(parsed.resultGroups) ? parsed.resultGroups : DEFAULT_STORAGE.resultGroups
        };
    }

    async save(storage: BatchValidationStorageRow): Promise<void> {
        await this.store.write(ROW_KEY, JSON.stringify(storage));
    }

    async close(): Promise<void> {
        this.store.close();
    }
}

const repoMap = new Map<string, BatchValidationRepository>();

export function getBatchValidationRepository(serverName: string): BatchValidationRepository {
    const key = escapeServerName(serverName || 'default');
    if (!repoMap.has(key)) {
        repoMap.set(key, new BatchValidationRepository(serverName || 'default'));
    }
    return repoMap.get(key)!;
}
