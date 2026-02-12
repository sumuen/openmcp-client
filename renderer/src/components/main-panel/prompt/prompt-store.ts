import { reactive, watch } from 'vue';
import type { SavedTestDataMap } from './prompts';

const STORAGE_KEY = 'openmcp-prompt-saved-test-data';

function loadFromStorage(): SavedTestDataMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as SavedTestDataMap;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function saveToStorage(data: SavedTestDataMap) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // ignore
    }
}

/** 全局共享的提词测试数据，所有 Tab 共用，持久化到 localStorage */
export const sharedPromptTestData = reactive<SavedTestDataMap>(loadFromStorage());

watch(
    () => sharedPromptTestData,
    (val) => saveToStorage(val),
    { deep: true }
);
