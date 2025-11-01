import { OmAgent } from '../../../openmcp-sdk/service/sdk';
import { useMcpConfig } from './global';

async function main() {
    const agent = new OmAgent();
    agent.loadMcpConfig(useMcpConfig('word-mcp'));
    
}

main();