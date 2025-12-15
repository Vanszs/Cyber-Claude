import { MCPServerConfig } from './types.js';

export const MCP_SERVERS: MCPServerConfig[] = [
  {
    name: 'nuclei',
    enabled: true,
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-nuclei'],
    env: { NUCLEI_TEMPLATES_PATH: '/root/nuclei-templates' },
  },
  {
    name: 'ffuf',
    enabled: true,
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-ffuf'],
  },
  {
    name: 'gobuster',
    enabled: true,
    command: 'npx',
    args: ['-y', '@cyproxio/mcp-gobuster'],
  },
  {
    name: 'dirbuster',
    enabled: true,
    command: 'npx', // Assuming a wrapper or similar tool exists or using a generic runner
    args: ['-y', '@cyproxio/mcp-dirbuster'],
  },
];