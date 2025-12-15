import { MCPServerConfig } from './types.js';

export const MCP_SERVERS: MCPServerConfig[] = [
  {
    name: 'nuclei',
    enabled: false,
    command: 'bun',
    args: ['x', '-y', '@cyproxio/mcp-nuclei'],
    env: { NUCLEI_TEMPLATES_PATH: '/root/nuclei-templates' },
  },
  {
    name: 'ffuf',
    enabled: false,
    command: 'bun',
    args: ['x', '-y', '@cyproxio/mcp-ffuf'],
  },
  {
    name: 'gobuster',
    enabled: false,
    command: 'bun',
    args: ['x', '-y', '@cyproxio/mcp-gobuster'],
  },
  {
    name: 'dirbuster',
    enabled: false,
    command: 'bun', // Assuming a wrapper or similar tool exists or using a generic runner
    args: ['x', '-y', '@cyproxio/mcp-dirbuster'],
  },
];