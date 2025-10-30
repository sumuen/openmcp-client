import { ref, type Ref } from 'vue';
import { getRefluxCount, getRefluxData } from '../api';
import type { RefluxItem } from '../types';

export function useRefluxData() {
    const items = ref<RefluxItem[]>([]);
    const loading = ref(false);
    const count = ref(0);
    const currentPage = ref(1);
    const pageSize = ref(20);

    const updateCount = async (name: string) => {
        const res = await getRefluxCount(name);
        if (res) {
            count.value = res;
        }
    };

    const fetchPage = async (name: string, page: number) => {
        if (loading.value) return;

        loading.value = true;
        try {
            const response = await getRefluxData(name, page, pageSize.value);
            if (response) {
                // 根据API定义，整个响应就是一个数组
                items.value = response;
                currentPage.value = page;
            } else {
                items.value = [];
            }
        } catch (error) {
            console.error('Failed to fetch reflux data:', error);
            items.value = [];
        } finally {
            loading.value = false;
        }
    };

    return {
        items,
        loading,
        count,
        currentPage,
        pageSize,
        fetchPage,
        updateCount
    };
}