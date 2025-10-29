export interface IConfig {
    MODEL_INDEX: number;
    LLM_INFO: any;
    LANG: string;
    MCP_TIMEOUT_SEC: number;
    PROXY_SERVER: string;
    [key: string]: any;
}