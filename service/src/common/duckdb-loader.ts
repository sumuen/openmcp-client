/**
 * 动态加载 duckdb，支持作为可选依赖。
 * 使用 batch-validation、reflux 等功能时需用户自行安装：npm install duckdb
 */
let duckdbModule: typeof import('duckdb') | null = null;

const DUCKDB_NOT_FOUND_MSG =
    'duckdb 未安装。如需使用 batch-validation 或 reflux 功能，请运行：npm install duckdb';

export async function loadDuckDb(): Promise<typeof import('duckdb')> {
    if (duckdbModule) return duckdbModule;
    try {
        duckdbModule = (await import('duckdb')).default;
        return duckdbModule;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Cannot find module') || msg.includes("Cannot find package")) {
            throw new Error(DUCKDB_NOT_FOUND_MSG);
        }
        throw err;
    }
}

export function setDuckDbForTest(mod: typeof import('duckdb') | null): void {
    duckdbModule = mod;
}
