import { ref } from 'vue';
import { useMessageBridge } from '@/api/message-bridge';
import type { TestCase } from '../../tools';

let currentClient: any | null = null;

export const testCasesState = ref<TestCase[]>([]);

export function initTestCasesStore(client: any) {
    currentClient = client;
    loadTestCases();
}

function getClientId(): string {
    if (!currentClient) throw new Error('Test cases store not initialized');
    return currentClient.clientId;
}

export async function saveTestCases() {
    if (!currentClient) return;
    const bridge = useMessageBridge();
    await bridge.commandRequest('test-cases/save', {
        clientId: getClientId(),
        testCases: testCasesState.value
    });
}

export async function loadTestCases() {
    if (!currentClient) return;
    const bridge = useMessageBridge();
    const { code, msg } = await bridge.commandRequest<{ testCases: TestCase[] }>('test-cases/load', {
        clientId: getClientId()
    });
    if (code === 200 && msg?.testCases) {
        testCasesState.value = msg.testCases;
    }
}

export function createTestCase(testCase: TestCase) {
    testCasesState.value = [...testCasesState.value, testCase];
    saveTestCases();
}

export function updateTestCase(id: string, patch: Partial<TestCase>) {
    testCasesState.value = testCasesState.value.map(tc => tc.id === id ? { ...tc, ...patch } : tc);
    saveTestCases();
}

export function deleteTestCase(id: string) {
    testCasesState.value = testCasesState.value.filter(tc => tc.id !== id);
    saveTestCases();
}
