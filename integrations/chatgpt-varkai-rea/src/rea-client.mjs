import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const DEFAULT_TIMEOUT_MS = 120000;
const MAX_MESSAGE_BYTES = 16 * 1024 * 1024;

/**
 * Persistent, local-only stdio MCP client for REA.
 * Never pass an untrusted command or package name to the spawned process.
 */
export class ReaClient {
  constructor({ entry = process.env.REA_ENTRY, node = process.env.REA_NODE || process.execPath } = {}) {
    this.entry = entry;
    this.node = node;
    this.child = null;
    this.pending = new Map();
    this.nextId = 1;
    this.starting = null;
    this.ready = false;
  }

  async connect() {
    if (this.ready && this.child && this.child.exitCode === null) return this;
    if (this.starting) return this.starting;
    this.starting = this.start();
    try {
      return await this.starting;
    } finally {
      this.starting = null;
    }
  }

  async start() {
    if (!this.entry || !this.entry.startsWith('/')) {
      throw new Error('REA_ENTRY must identify an absolute path to the installed REA scripts/rea.mjs.');
    }
    const child = spawn(this.node, [this.entry, 'mcp'], {
      cwd: process.env.REA_WORKDIR || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      shell: false
    });
    this.child = child;
    this.ready = false;

    const disconnect = (error) => {
      if (this.child === child) {
        this.child = null;
        this.ready = false;
      }
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(error);
      }
      this.pending.clear();
    };
    child.once('error', (err) => disconnect(new Error('REA launch failed: ' + err.message)));
    child.once('exit', (code) => disconnect(new Error('REA process exited: ' + code)));

    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on('line', (line) => {
      if (Buffer.byteLength(line) > MAX_MESSAGE_BYTES) {
        child.kill();
        return;
      }
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message.id === undefined || message.id === null) return;
      const pending = this.pending.get(String(message.id));
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(String(message.id));
      if (message.error) pending.reject(new Error(message.error.message || 'REA MCP error'));
      else pending.resolve(message.result);
    });
    // Do not echo backend stderr: it may include user paths or other private data.
    child.stderr.on('data', () => {});

    try {
      await this.request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'varkai-rea-chatgpt-bridge', version: '0.1.0' }
      }, 30000);
      this.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
      this.ready = true;
      return this;
    } catch (error) {
      child.kill();
      throw error;
    }
  }

  send(message) {
    if (!this.child || this.child.exitCode !== null || !this.child.stdin.writable) {
      throw new Error('REA subprocess is not running.');
    }
    this.child.stdin.write(JSON.stringify(message) + '\n');
  }

  request(method, params = {}, timeout = DEFAULT_TIMEOUT_MS) {
    const id = String(this.nextId++);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('REA request timed out.'));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.send({ jsonrpc: '2.0', id, method, params });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async listTools() {
    await this.connect();
    const response = await this.request('tools/list');
    return response.tools || [];
  }

  async callTool(name, args) {
    await this.connect();
    return this.request('tools/call', { name, arguments: args });
  }

  close() {
    if (this.child) this.child.kill();
    this.ready = false;
  }
}
