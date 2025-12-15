# Cyber-Claude 🛡️🤖

![Version](https://img.shields.io/badge/version-0.8.0-blue.svg)
![Runtime](https://img.shields.io/badge/runtime-Bun-black?logo=bun)
![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

**Cyber-Claude** is an advanced **AI-Powered Cybersecurity Agent** designed for autonomous red teaming, easy blue team analysis, and dynamic security operations. It leverages state-of-the-art LLMs and the **Model Context Protocol (MCP)** to intelligently chain tools and execute complex security workflows naturally.

---

## 🚀 Key Features

*   **🧠 Agnostic AI Agents**: Works with **Claude** (Anthropic), **GPT-5** (OpenAI), **Gemini** (Google), **GLM-4** (Zhipu/ZAPI), and **Ollama** (Local Models).
*   **🔗 Dynamic MCP Support**: The agent autonomously discovers, plans, and executes tools like **Nuclei**, **FFUF**, **Gobuster**, and **Dirbuster**. No rigid CLI flags required.
*   **🕷️ Autonomous Web Scanner**: Full OWASP Top 10 vulnerability scanning with automated exploit validation (safe/mocked).
*   **🕵️ OSINT Orchestrator**: Passive reconnaissance tools for subdomains, DNS, and potential data breaches.
*   **🕸️ Web3 / Smart Contract Analysis**: Specialized detectors for Solidity vulnerabilities (Reentrancy, Flash Loans, etc.).
*   **💬 Interactive Shell**: Conversational interface that feels like talking to a senior security engineer.

---

## 🛠️ Installation

This project uses [Bun](https://bun.sh) for ultra-fast performance.

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/cyber-claude.git
cd cyber-claude

# 2. Install dependencies
bun install

# 3. Build the agent
bun run build
```

## ⚙️ Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Configure your preferred AI providers:

```ini
# Choose your main model (defaults to Claude Sonnet 4.5)
MODEL=claude-sonnet-4-5

# Provider API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
ZAPI_API_KEY=...

# Local Models (Optional)
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 💻 Usage

### Interactive Mode (Recommended)
Start the autonomous agent session. You can speak naturally.

```bash
bun start interactive
> "Please scan example.com for vulnerabilities using Nuclei and FFUF."
```

### Quick Commands

**Web Scanning:**
```bash
bun start webscan https://example.com --deep
```

**Smart Contract Analysis:**
```bash
bun start web3 scan contracts/VulnerableToken.sol
```

**OSINT Reconnaissance:**
```bash
bun start scan --target google.com --quick
```

---

## 🧠 Architecture

Cyber-Claude is built on a **Dynamic Agentic Loop**:

1.  **Perceive**: The Agent receives your natural language request.
2.  **Discover**: It queries connected **MCP Servers** to see what tools are available.
3.  **Plan**: It formulates a multi-step execution plan (e.g., Recon -> Scanning -> Verification).
4.  **Act**: It executes tools autonomously and interprets the results in real-time.
5.  **Reflect**: It acts on findings (e.g., "I found an admin panel, now I will scan it for SQLi").

---

## 🛡️ Disclaimer

This tool is for **EDUCATIONAL** and **AUTHORIZED TESTING** purposes only.
*   Do not scan targets you do not own or have explicit permission to test.
*   The developers assume no liability for misuse of this software.

---

Made with ❤️ by the Cyber-Claude Team
