import { OmAgent } from '../../../openmcp-sdk/service/sdk.js';
import { useMcpConfig } from './global.js';

async function test(userInput: string) {
    const agent = new OmAgent();
    agent.loadMcpConfig(useMcpConfig('word-mcp'));
    const query = userInput;

    const result = await agent.ainvoke({
        messages: query,
    });

    console.log('test result: ', result);
}

test('hello');
