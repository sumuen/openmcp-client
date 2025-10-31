import { OmAgent } from '../../../openmcp-sdk/service/sdk';

async function main() {
    const agent = new OmAgent();
    agent.loadMcpConfig('')
}

main();