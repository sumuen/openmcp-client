import path from 'path';

const __dirname = path.dirname(import.meta.filename);

export const MCP_CONFIG_HOME = path.resolve(__dirname, '../../openmcp');

export function useMcpConfig(name: string) {
    return path.join(MCP_CONFIG_HOME, 'openmcp', name + '.json');
}