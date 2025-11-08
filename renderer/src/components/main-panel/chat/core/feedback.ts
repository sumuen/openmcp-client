import chalk from 'chalk';

import type { ChatMessage, ChatStorage, IExtraInfo, MessageState, ToolCall } from "../chat-box/chat";
import type { ToolCallResult } from './handle-tool-calls';
import type { ChatCompletionChunk } from 'openai/resources/index.mjs';
import { makeUsageStatistic, type TokenConsumptionResult } from './usage';
import { useMessageBridge } from '@/api/message-bridge';
import { mcpSetting } from '@/hook/mcp';
import { logTimeStampString } from '@/hook/util';
import type { BasicLlmDescription } from '@/views/setting/llm';

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

            // const usage = makeUsageStatistic(extraInfo);
            // if (usage) {
            //     console.log(
            //         chalk.gray(' '.repeat(time.length + 3) + '└─'),
            //         chalk.gray(
            //             `input: ${usage.input}  output: ${usage.output}  total: ${usage.total}  cache: ${(
            //                 usage.cacheHitRatio * 100
            //             ).toFixed(1)}%`
            //         )
            //     );
            // }
        }
    }

    consumeEpochs() {
        if (this.verbose > 1) {
            console.log(
                chalk.gray(`${logTimeStampString()} |`),
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
                chalk.gray(`${logTimeStampString()} |`),
                chalk.red('❌ error happen in task loop '),
                chalk.red(error.msg)
            );
        }
    }

    consumeChunks(
        chunk: ChatCompletionChunk
    ) {
        if (this.verbose > 1) {
            console.log(
                chalk.gray(`${logTimeStampString()} |`),
                chalk.blue('receive chunk')
            );
        } else if (this.verbose > 2) {
            const delta = chunk.choices[0]?.delta;
            if (delta) {
                console.log(
                    chalk.gray(`${logTimeStampString()} |`),
                    chalk.blue('receive chunk'),
                    chalk.bold(JSON.stringify(delta, null, 2))
                );
            } else {
                console.log(
                    chalk.gray(`${logTimeStampString()} |`),
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
                    chalk.green(`✅ ${toolCallResult.function?.name}`)
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
                chalk.gray(`${logTimeStampString()} |`),
                chalk.green('task loop finish a epoch')
            );
        }
    }

    consumeTokenConsumption(storage: ChatStorage, llmConfig?: BasicLlmDescription): TokenConsumptionResult {
        const messages = storage.messages;
        const displayLog = Boolean(this.verbose > 0 && messages);

        // 展示 token 消耗量
        let totalInput = 0;
        let totalOutput = 0;
        let totalTokens = 0;
        let totalHitInput = 0;

        for (const message of messages ?? []) {
            const usage = makeUsageStatistic(message.extraInfo);
            if (usage) {
                totalInput += usage.input;
                totalOutput += usage.output;
                totalTokens += usage.total;
                totalHitInput += usage.cachedInput;
            }
        }

        const avgCacheHitRatio = totalHitInput / totalInput;
        const pricing = llmConfig?.pricing;
        const time = logTimeStampString();
        if (pricing) {
            const cost = (pricing.inputPerMilleHitCache * totalHitInput +
                pricing.inputPerMille * (totalInput - totalHitInput) +
                pricing.outputPerMille * totalOutput) / 1000000;

            if (displayLog) {
                console.log(
                    chalk.gray(' '.repeat(time.length + 3) + '└─'),
                    chalk.gray(`⬇ ${totalInput}`),
                    chalk.gray(`⬆ ${totalOutput}`),
                    chalk.gray(`🎯${(avgCacheHitRatio * 100).toFixed(1)}%`),
                    // 账单保留5位小数
                    chalk.gray(`💰${(cost.toFixed(4))}${pricing.unit}`)
                );
            }


            return {
                totalInput,
                totalOutput,
                totalHitInput,
                cost,
                pricing,
                avgCacheHitRatio,
            };
        } else {
            if (displayLog) {
                console.log(
                    chalk.gray(' '.repeat(time.length + 3) + '└─'),
                    chalk.gray(`⬇ ${totalInput}`),
                    chalk.gray(`⬆ ${totalOutput}`),
                    chalk.gray(`🎯${(avgCacheHitRatio * 100).toFixed(1)}%`)
                );
            }
            return {
                totalInput,
                totalOutput,
                totalHitInput,
                avgCacheHitRatio,
            };
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
