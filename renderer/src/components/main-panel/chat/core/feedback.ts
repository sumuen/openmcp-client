import chalk from 'chalk';

import type { ChatStorage, IExtraInfo, MessageState, ToolCall } from "../chat-box/chat";
import type { ToolCallResult } from './handle-tool-calls';
import type { ChatCompletionChunk } from 'openai/resources/index.mjs';
import { makeUsageStatistic } from './usage';
import { useMessageBridge } from '@/api/message-bridge';
import { mcpSetting } from '@/hook/mcp';
import { logTimeStampString } from '@/hook/util';

export class OmFeedback {
    constructor(
        private verbose: number,
    ) {

    }

    consumeLlmResponse(
        toolCalls: ToolCall[],
        extraInfo: IExtraInfo
    ) {
        if (this.verbose > 0) {
            const time = logTimeStampString();
            console.log(
                chalk.gray(`${time} |`),
                chalk.yellow(`🤖 Agent wants to use tools(${toolCalls.length})`),
                chalk.yellow(toolCalls.map(tool => tool.function!.name || '').join(', '))
            );

            const usage = makeUsageStatistic(extraInfo);
            if (usage) {
                console.log(
                    chalk.gray(' '.repeat(time.length + 3) + '└─'),
                    chalk.gray(
                        `input: ${usage.input}  output: ${usage.output}  total: ${usage.total}  cache: ${(
                            usage.cacheHitRatio * 100
                        ).toFixed(1)}%`
                    )
                );
            }
        }
    }

    consumeEpochs() {
        if (this.verbose > 1) {
            console.log(
                chalk.gray(`[${new Date().toLocaleString()}]`),
                chalk.blue('task loop enters a new epoch')
            );
        }
    }

    consumeErrors(
        error: {
            state: MessageState,
            msg: string
        }
    ) {
        if (this.verbose > 0) {
            console.log(
                chalk.gray(`[${new Date().toLocaleString()}]`),
                chalk.red('error happen in task loop '),
                chalk.red(error.msg)
            );
        }
    }

    consumeChunks(
        chunk: ChatCompletionChunk
    ) {
        if (this.verbose > 1) {
            console.log(
                chalk.gray(`[${new Date().toLocaleString()}]`),
                chalk.blue('receive chunk')
            );
        } else if (this.verbose > 2) {
            const delta = chunk.choices[0]?.delta;
            if (delta) {
                console.log(
                    chalk.gray(`[${new Date().toLocaleString()}]`),
                    chalk.blue('receive chunk'),
                    chalk.bold(JSON.stringify(delta, null, 2))
                );
            } else {
                console.log(
                    chalk.gray(`[${new Date().toLocaleString()}]`),
                    chalk.blue('receive chunk'),
                    chalk.blue('delta is empty')
                );
            }
        }
    }

    consumeToolCalls(
        toolCall: ToolCall
    ) {

    }

    consumeToolCalleds(
        toolCallResult: ToolCallResult
    ) {
        if (this.verbose > 0) {
            if (toolCallResult.state === 'success') {
                console.log(
                    chalk.gray(`${logTimeStampString()} |`),
                    chalk.green(`✅ ${toolCallResult.function?.name}`),
                    chalk.green(toolCallResult.state)
                );
            } else {
                console.log(
                    chalk.gray(`${logTimeStampString()} |`),
                    chalk.red(`❌ ${toolCallResult.function?.name}`),
                    chalk.red(toolCallResult.content.map(item => item.text).join(', '))
                );
            }
        }
    }

    consumeDones() {
        if (this.verbose > 1) {
            console.log(
                chalk.gray(`[${new Date().toLocaleString()}]`),
                chalk.green('task loop finish a epoch')
            );
        }
    }

    async makeTraceSchema() {

    }
    
    async reflux(storage: ChatStorage) {        
        if (!mcpSetting.enableDatasetReflux) {
            return;
        }

        // TODO: 根据 storage 内容和预定义的 evaluator 判断是否需要执行更新        
        const bridge = useMessageBridge();
        const res = await bridge.commandRequest('feedback/reflux', {
            storage,
            name: mcpSetting.datasetName
        });

        console.log(res);
        

        if (res.code !== 200) {
            console.error(
                chalk.gray(`${logTimeStampString()} |`),
                chalk.red('reflux fail: '),
                chalk.red(res.msg)
            );
        }
        
        if (this.verbose > 1) {
            console.log(
                chalk.gray(`${logTimeStampString()} |`),
                chalk.blue('reflux'),
                chalk.blue(res.msg)
            );
        }
    }
}
