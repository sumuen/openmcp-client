import { chatCompletion } from "../llm/llm.service.js";

export type EvaluationMode = 'pass-fail' | 'score';

export interface TestCase {
    id: string;
    /** 测试用例描述/期望：模型输出应满足的条件 */
    expectedCriteria: string;
    name?: string;
}

export interface BatchValidationOptions {
    /** 对话消息列表 (user/assistant 多轮) */
    messages: Array<{ role: string; content: string }>;
    /** 测试用例列表 */
    testCases: TestCase[];
    /** 评估模式：对错 或 0-10 评分 */
    evaluationMode: EvaluationMode;
    /** 自定义评估提示词模板，支持占位符: {{testCase}}, {{messages}} */
    customPrompt?: string;
    /** LLM 配置 */
    llmConfig: {
        baseURL: string;
        apiKey: string;
        model: string;
        temperature?: number;
    };
}

export interface ValidationResult {
    testCaseId: string;
    testCaseCriteria: string;
    rawResponse: string;
    /** pass-fail 模式: 'pass' | 'fail' | 'unknown' */
    pass?: boolean;
    /** score 模式: 0-10 */
    score?: number;
    error?: string;
}

const DEFAULT_PASS_FAIL_PROMPT = `你是一个严格的输出评估专家。请根据以下「测试用例期望」判断「模型的实际对话输出」是否满足期望。

## 测试用例期望
{{testCase}}

## Agent 执行 Trace（输入与工具调用的完整记录）
{{messages}}

请仅回复一个字：
- 若满足期望，回复：对
- 若不满足期望，回复：错`;

const DEFAULT_SCORE_PROMPT = `你是一个严格的输出评估专家。请根据以下「测试用例期望」对「模型的实际对话输出」进行评分。

## 测试用例期望
{{testCase}}

## Agent 执行 Trace（输入与工具调用的完整记录）
{{messages}}

请仅回复一个0-10的整数分数，0表示完全不满足，10表示完全满足。`;

function formatMessagesForPrompt(messages: Array<{ role: string; content: string }>): string {
    return messages
        .map((m) => {
            const roleLabel =
                m.role === 'user' ? '用户' :
                m.role === 'assistant' ? '助手' :
                m.role === 'tool' ? '工具' : m.role;
            return `【${roleLabel}】\n${m.content}`;
        })
        .join('\n\n---\n\n');
}

function buildEvaluationPrompt(
    testCase: TestCase,
    messagesText: string,
    mode: EvaluationMode,
    customPrompt?: string
): string {
    const template =
        customPrompt?.trim() ||
        (mode === 'pass-fail' ? DEFAULT_PASS_FAIL_PROMPT : DEFAULT_SCORE_PROMPT);
    return template
        .replace(/\{\{testCase\}\}/g, testCase.expectedCriteria)
        .replace(/\{\{messages\}\}/g, messagesText);
}

function parsePassFailResponse(text: string): boolean | 'unknown' {
    const t = text.trim().toLowerCase();
    if (t.includes('对') || t === 'true' || t === 'yes' || t === 'pass' || t === '1') return true;
    if (t.includes('错') || t === 'false' || t === 'no' || t === 'fail' || t === '0') return false;
    return 'unknown';
}

function parseScoreResponse(text: string): number | null {
    const match = text.match(/\b([0-9]|10)\b/);
    if (match) {
        const n = parseInt(match[1], 10);
        if (n >= 0 && n <= 10) return n;
    }
    return null;
}

export async function runBatchValidation(
    options: BatchValidationOptions
): Promise<ValidationResult[]> {
    const { messages, testCases, evaluationMode, customPrompt, llmConfig } = options;
    const messagesText = formatMessagesForPrompt(messages);

    const tasks = testCases.map(async (tc) => {
        const systemContent = buildEvaluationPrompt(tc, messagesText, evaluationMode, customPrompt);
        const judgeMessages = [
            { role: 'system' as const, content: systemContent },
            { role: 'user' as const, content: '请根据上述要求进行评估并回复。' }
        ];

        try {
            const content = await chatCompletion({
                baseURL: llmConfig.baseURL,
                apiKey: llmConfig.apiKey,
                model: llmConfig.model,
                messages: judgeMessages,
                temperature: llmConfig.temperature ?? 0
            });

            const result: ValidationResult = {
                testCaseId: tc.id,
                testCaseCriteria: tc.expectedCriteria,
                rawResponse: content
            };

            if (evaluationMode === 'pass-fail') {
                const pass = parsePassFailResponse(content);
                result.pass = pass === 'unknown' ? undefined : pass;
            } else {
                const score = parseScoreResponse(content);
                result.score = score ?? undefined;
            }

            return result;
        } catch (err) {
            return {
                testCaseId: tc.id,
                testCaseCriteria: tc.expectedCriteria,
                rawResponse: '',
                error: err instanceof Error ? err.message : String(err)
            } as ValidationResult;
        }
    });

    return Promise.all(tasks);
}
