import type { PromptsGetResponse } from '@/hook/type';

/** 单条保存的测试数据 */
export interface SavedTestDataSet {
    name: string;
    data: Record<string, any>;
    createdAt?: number;
}

/** 按 prompt 名称存储的测试数据 */
export type SavedTestDataMap = Record<string, SavedTestDataSet[]>;

export interface PromptStorage {
    activeNames: any[];
    currentPromptName: string;
    lastPromptGetResponse?: PromptsGetResponse;
    formData: Record<string, any>;
    /** 按 prompt 名称分组的已保存测试数据 */
    savedTestData?: SavedTestDataMap;
}

export function parsePromptTemplate(template: string): {
    params: string[],
    fill: (params: Record<string, string>) => string
} {
    const paramRegex = /\{([^}]+)\}/g;
    const params = new Set<string>();
    let match;

    while ((match = paramRegex.exec(template)) !== null) {
        params.add(match[1]);
    }

    const paramList = Array.from(params);

    const fill = (values: Record<string, string>): string => {
        let result = template;

        for (const param of paramList) {
            if (values[param] === undefined) {
                throw new Error(`缺少必要参数: ${param}`);
            }
        }

        for (const param of paramList) {            
            result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), values[param]);
        }

        return result;
    };

    return {
        params: paramList,
        fill
    };
}