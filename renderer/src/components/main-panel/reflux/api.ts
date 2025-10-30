import { useMessageBridge } from "@/api/message-bridge";
import type { ChatStorage } from "../chat/chat-box/chat";

export type GetRefluxDataDto = {
    id: string;
    data: ChatStorage;
    timestamp: number;
}[] | undefined;

export async function getRefluxCount(name: string): Promise<number | undefined> {
    const bridge = useMessageBridge();
    const res = await bridge.commandRequest('feedback/reflux/get-count', { name });    
    if (res.code === 200) {
        return res.msg;
    }
    return undefined;
}

export async function getRefluxData(name: string, page: number, pageSize: number): Promise<GetRefluxDataDto | undefined> {
    const bridge = useMessageBridge();
    const res = await bridge.commandRequest('feedback/reflux/get-data', { name, page, pageSize });    
    if (res.code === 200) {
        return res.msg;
    }
    console.log(res);
    return undefined;
}


export async function findTraceByHash(name: string, hash: string): Promise<string | undefined> {
    const bridge = useMessageBridge();
    const res = await bridge.commandRequest('feedback/reflux/findTraceByHash', { name, hash });
    if (res.code === 200) {
        return res.msg;
    }
    console.log(res);
    return undefined;
}


export async function findEnableToolsByHash(name: string, hash: string): Promise<any[] | undefined> {
    const bridge = useMessageBridge();
    const res = await bridge.commandRequest('feedback/reflux/findEnableToolsByHash', { name, hash });
    if (res.code === 200) {
        return res.msg;
    }

    console.log(res);
    return undefined;
}