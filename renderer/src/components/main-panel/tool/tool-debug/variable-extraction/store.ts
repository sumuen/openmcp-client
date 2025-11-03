import { ref } from 'vue';
import { useMessageBridge } from '@/api/message-bridge';

export type RuleItem = { path: string; name: string };

let currentClient: any | null = null;

// 以工具名为 key 的规则映射
export const extractionRulesState = ref<Record<string, RuleItem[]>>({});

export function initExtractionRulesStore(client: any) {
    currentClient = client;
    // 加载该 server 的规则
    // 忽略 await，保持与变量存储一致的用法
    loadExtractionRules();
}

function getClientId(): string {
    if (!currentClient) throw new Error('Extraction rules store not initialized');
    return currentClient.clientId;
}

export async function saveExtractionRules() {
    if (!currentClient) return;
    const bridge = useMessageBridge();
    await bridge.commandRequest('extraction-rules/save', {
        clientId: getClientId(),
        extractionRules: extractionRulesState.value
    });
}

export async function loadExtractionRules() {
    if (!currentClient) return;
    const bridge = useMessageBridge();
    const { code, msg } = await bridge.commandRequest<{ extractionRules: Record<string, RuleItem[]> }>('extraction-rules/load', {
        clientId: getClientId()
    });
    if (code === 200 && msg?.extractionRules) {
        extractionRulesState.value = { ...msg.extractionRules };
    }
}

export function getRulesForTool(toolName?: string): RuleItem[] {
    const key = toolName || '__unknown__';
    const map = extractionRulesState.value;
    return map[key] || [];
}

export function setRulesForTool(toolName: string | undefined, rules: RuleItem[]): void {
    const key = toolName || '__unknown__';
    extractionRulesState.value = {
        ...extractionRulesState.value,
        [key]: rules
    };
    // 后端保存
    saveExtractionRules();
}
