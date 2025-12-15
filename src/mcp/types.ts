import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface MCPServerConfig {
    name: string;
    enabled: boolean;
    command: string;
    args: string[];
    env?: Record<string, string>;
}

export interface MCPToolCall {
    serverName: string;
    toolName: string;
    arguments: Record<string, any>;
}

export interface NucleiResult {
    scan_id: string;
    timestamp: string;
    results: Array<{
        template_id: string;
        info: {
            name: string;
            severity: string;
            description?: string;
        };
        host: string;
        matched_at: string;
        ip?: string;
    }>;
}

export interface FfufResult {
    commandline: string;
    time: string;
    results: Array<{
        input: {
            FFUFHASH: string;
            FUZZ: string;
        };
        position: number;
        status: number;
        length: number;
        words: number;
        lines: number;
        content_type: string;
        redirectlocation: string;
        url: string;
    }>;
}

export interface GobusterResult {
    found: Array<{
        path: string;
        status: number;
        size: number;
    }>;
}

export interface DirbusterResult {
    // Mapping legacy dirbuster results to a standard format similar to Gobuster
    found: Array<{
        path: string;
        status: number;
        size: number;
    }>;
}
