/**
 * 测试用例工具函数集
 * 提供了一些常用的测试用例操作辅助函数
 */

import type { TestCase, ToolStorage } from '../../tools';
import type { ToolCallResponse } from '@/hook/type';

/**
 * 导出测试用例为 JSON 文件
 */
export function exportTestCasesToJSON(testCases: TestCase[]): string {
    return JSON.stringify(testCases, null, 2);
}

/**
 * 从 JSON 导入测试用例
 */
export function importTestCasesFromJSON(jsonString: string): TestCase[] {
    try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) {
            throw new Error('Invalid format: expected array');
        }
        return parsed;
    } catch (e) {
        console.error('Failed to import test cases:', e);
        return [];
    }
}

/**
 * 按工具名称过滤测试用例
 */
export function filterTestCasesByTool(testCases: TestCase[], toolName: string): TestCase[] {
    return testCases.filter(tc => tc.toolName === toolName);
}

/**
 * 按状态过滤测试用例
 */
export function filterTestCasesByStatus(
    testCases: TestCase[], 
    status: 'pending' | 'passed' | 'failed' | 'running'
): TestCase[] {
    return testCases.filter(tc => tc.status === status);
}

/**
 * 获取测试统计信息
 */
export interface TestStatistics {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    passRate: number;
}

export function getTestStatistics(testCases: TestCase[]): TestStatistics {
    const total = testCases.length;
    const passed = testCases.filter(tc => tc.status === 'passed').length;
    const failed = testCases.filter(tc => tc.status === 'failed').length;
    const pending = testCases.filter(tc => tc.status === 'pending').length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return {
        total,
        passed,
        failed,
        pending,
        passRate
    };
}

/**
 * 按工具分组测试用例
 */
export function groupTestCasesByTool(testCases: TestCase[]): Record<string, TestCase[]> {
    const grouped: Record<string, TestCase[]> = {};
    
    for (const testCase of testCases) {
        if (!grouped[testCase.toolName]) {
            grouped[testCase.toolName] = [];
        }
        grouped[testCase.toolName].push(testCase);
    }
    
    return grouped;
}

/**
 * 对比两个输出是否相同
 * 可以根据需要扩展对比逻辑
 */
export function compareOutputs(
    output1: ToolCallResponse | undefined, 
    output2: ToolCallResponse | undefined
): boolean {
    if (!output1 || !output2) return false;
    
    // 简单的 JSON 字符串对比
    // 可以扩展为更智能的对比逻辑
    return JSON.stringify(output1) === JSON.stringify(output2);
}

/**
 * 生成测试报告（Markdown 格式）
 */
export function generateTestReport(testCases: TestCase[]): string {
    const stats = getTestStatistics(testCases);
    const grouped = groupTestCasesByTool(testCases);
    
    let report = '# 测试报告\n\n';
    report += `## 总体统计\n\n`;
    report += `- 总用例数: ${stats.total}\n`;
    report += `- 通过: ${stats.passed}\n`;
    report += `- 失败: ${stats.failed}\n`;
    report += `- 待执行: ${stats.pending}\n`;
    report += `- 通过率: ${stats.passRate.toFixed(2)}%\n\n`;
    
    report += `## 按工具分组\n\n`;
    
    for (const [toolName, cases] of Object.entries(grouped)) {
        const toolStats = getTestStatistics(cases);
        report += `### ${toolName}\n\n`;
        report += `- 用例数: ${toolStats.total}\n`;
        report += `- 通过: ${toolStats.passed}\n`;
        report += `- 失败: ${toolStats.failed}\n`;
        report += `- 通过率: ${toolStats.passRate.toFixed(2)}%\n\n`;
        
        report += `| 用例名称 | 状态 | 更新时间 |\n`;
        report += `|---------|------|----------|\n`;
        
        for (const testCase of cases) {
            const statusEmoji = testCase.status === 'passed' ? '✅' : 
                               testCase.status === 'failed' ? '❌' : 
                               testCase.status === 'running' ? '⏳' : '⏸️';
            const updatedTime = new Date(testCase.updatedAt).toLocaleString();
            report += `| ${testCase.name} | ${statusEmoji} ${testCase.status} | ${updatedTime} |\n`;
        }
        
        report += '\n';
    }
    
    return report;
}

/**
 * 复制测试用例（深拷贝）
 */
export function cloneTestCase(testCase: TestCase): TestCase {
    return {
        ...testCase,
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        input: JSON.parse(JSON.stringify(testCase.input)),
        actualOutput: testCase.actualOutput 
            ? JSON.parse(JSON.stringify(testCase.actualOutput)) 
            : undefined,
        expectedOutput: testCase.expectedOutput 
            ? JSON.parse(JSON.stringify(testCase.expectedOutput)) 
            : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

/**
 * 批量更新测试用例状态
 */
export function resetTestCasesStatus(testCases: TestCase[]): void {
    for (const testCase of testCases) {
        testCase.status = 'pending';
        testCase.actualOutput = undefined;
    }
}

/**
 * 验证测试用例数据完整性
 */
export function validateTestCase(testCase: Partial<TestCase>): boolean {
    if (!testCase.name || testCase.name.trim() === '') return false;
    if (!testCase.toolName || testCase.toolName.trim() === '') return false;
    if (!testCase.input || typeof testCase.input !== 'object') return false;
    return true;
}

/**
 * 查找重复的测试用例
 * 基于名称和工具名称判断
 */
export function findDuplicateTestCases(testCases: TestCase[]): TestCase[][] {
    const groups = new Map<string, TestCase[]>();
    
    for (const testCase of testCases) {
        const key = `${testCase.toolName}:${testCase.name}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(testCase);
    }
    
    return Array.from(groups.values()).filter(group => group.length > 1);
}

/**
 * 自动清理过期的测试用例
 * @param testCases 测试用例数组
 * @param daysOld 多少天前的测试用例算作过期
 */
export function cleanupOldTestCases(testCases: TestCase[], daysOld: number = 90): TestCase[] {
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    return testCases.filter(tc => tc.updatedAt >= cutoffDate);
}
