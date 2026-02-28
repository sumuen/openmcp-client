import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const MCP_CONFIG_HOME = path.resolve(__dirname, '..', '..', '..', 'openmcp');

export function useMcpConfig(name: string) {
    return path.join(MCP_CONFIG_HOME, name + '.json');
}