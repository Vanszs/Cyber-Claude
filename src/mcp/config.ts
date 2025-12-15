import { MCPServerConfig } from './types.js';

export const MCP_SERVERS: MCPServerConfig[] = [
  {
    name: 'nuclei',
    enabled: true,
    command: 'bun',
    args: ['x', '-y', '@cyproxio/mcp-nuclei'],
    env: { NUCLEI_TEMPLATES_PATH: '/root/nuclei-templates' },
  },
  {
    name: 'ffuf',
    enabled: true,
    command: 'bun',
    args: ['x', '-y', '@cyproxio/mcp-ffuf'],
  },
  {
    name: 'gobuster',
    enabled: true,
    command: 'bun',
    args: ['x', '-y', '@cyproxio/mcp-gobuster'],
  },
  {
    name: 'dirbuster',
    enabled: true,
    command: 'bun', // Assuming a wrapper or similar tool exists or using a generic runner
    args: ['x', '-y', '@cyproxio/mcp-dirbuster'],
  },
];