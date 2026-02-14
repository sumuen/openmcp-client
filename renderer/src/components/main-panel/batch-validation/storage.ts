/** 单个测试用例（可持久化） */
export interface BatchValidationTestCase {
    id: string;
    name?: string;
    description?: string;
    input: string;
    criteria: string[];
}

/** 批量验证面板绑定到 tab.storage 的可持久化数据结构 */
export interface BatchValidationStorage {
    /** 每个交互测试标签页索引对应的测试用例 */
    testCasesByTabIndex: Record<number, BatchValidationTestCase>;
    /** 当前选中的标签页索引 */
    selectedTabIndex: number;
    /** 评估模式：通过/失败 或 分数 */
    evaluationMode: 'pass-fail' | 'score';
}

const DEFAULT_STORAGE: BatchValidationStorage = {
    testCasesByTabIndex: {},
    selectedTabIndex: 0,
    evaluationMode: 'pass-fail'
};

/** 确保 storage 具备 BatchValidationStorage 形状（就地补全缺失字段） */
export function ensureBatchValidationStorage(storage: Record<string, any>): storage is BatchValidationStorage {
    if (typeof storage.testCasesByTabIndex !== 'object' || storage.testCasesByTabIndex === null) {
        storage.testCasesByTabIndex = {};
    }
    if (typeof storage.selectedTabIndex !== 'number') {
        storage.selectedTabIndex = DEFAULT_STORAGE.selectedTabIndex;
    }
    if (storage.evaluationMode !== 'pass-fail' && storage.evaluationMode !== 'score') {
        storage.evaluationMode = DEFAULT_STORAGE.evaluationMode;
    }
    return true;
}
