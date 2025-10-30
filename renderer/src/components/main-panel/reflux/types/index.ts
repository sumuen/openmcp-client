import type { ChatStorage } from "../../chat/chat-box/chat";

export interface RefluxItem {
    id: string;
    data: ChatStorage;
    timestamp: number;
}

export interface RefluxListResponse {
    items: RefluxItem[];
    total: number;
    page: number;
    pageSize: number;
}


export interface RefluxStorage {
    page: number;
}