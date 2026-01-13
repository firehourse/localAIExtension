import * as vscode from 'vscode';
import { AgentState, createAgentState, handlePrompt } from './agent/agent';

/**
 * 視圖 ID，和 package.json 一致
 */
export const SIDEBAR_VIEW_TYPE = 'devorkAiPrompt_sidebarView';

/**
 * SidebarContext 存放與 UI 相關的狀態
 */
interface SidebarContext {
    extensionContext: vscode.ExtensionContext;
    agent: AgentState;
}

/**
 * Factory Function: 建立並回傳一個符合 vscode.WebviewViewProvider 介面的物件
 */
export function createSidebarViewProvider(extensionContext: vscode.ExtensionContext): vscode.WebviewViewProvider {
    // 初始化 UI 上下文與 Agent 狀態
    const ctx: SidebarContext = {
        extensionContext: extensionContext,
        agent: createAgentState()
    };

    return {
        resolveWebviewView(
            webviewView: vscode.WebviewView,
            _context: vscode.WebviewViewResolveContext,
            _token: vscode.CancellationToken
        ) {
            console.log('[SidebarViewProvider] resolveWebviewView called');

            webviewView.webview.options = { enableScripts: true };
            webviewView.webview.html = getHtmlContent();

            webviewView.webview.onDidReceiveMessage(async (message) => {
                console.log('[SidebarViewProvider] onDidReceiveMessage:', message);

                if (message.command === 'sendPrompt') {
                    const { apiUrl, text } = message;

                    // 呼叫「後端」Agent 邏輯
                    const response = await handlePrompt(ctx.agent, apiUrl, text);

                    webviewView.webview.postMessage({
                        command: 'showResponse',
                        text: response
                    });
                }
            });
        }
    };
}

/**
 * 取得 HTML 內容 (純 UI)
 */
function getHtmlContent(): string {
    return /* html */ `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
        <meta charset="UTF-8" />
        <style>
            body { font-family: sans-serif; margin: 10px; }
            #promptInput, #apiUrlInput { width: 100%; margin-bottom: 8px; }
            #promptInput { height: 80px; }
            #response { margin-top: 10px; white-space: pre-wrap; border: 1px solid #ccc; padding: 8px; min-height: 50px; }
            button { padding: 6px 16px; cursor: pointer; }
        </style>
    </head>
    <body>
        <h2>Devok AI Prompt</h2>
        <label>API 伺服器網址：</label>
        <input id="apiUrlInput" type="text" placeholder="輸入 API 伺服器網址..." />
        <textarea id="promptInput" placeholder="輸入你的問題..."></textarea><br/>
        <button id="sendBtn">發送</button>
        <div id="response"></div>
        <script>
            const vscode = acquireVsCodeApi();
            const promptInput = document.getElementById('promptInput');
            const apiUrlInput = document.getElementById('apiUrlInput');
            const storedState = vscode.getState();
            if (storedState?.apiUrl) apiUrlInput.value = storedState.apiUrl;
            if (storedState?.lastPrompt) promptInput.value = storedState.lastPrompt;
            document.getElementById('sendBtn').addEventListener('click', () => {
                const apiUrl = apiUrlInput.value.trim();
                const prompt = promptInput.value.trim();
                if (!apiUrl) { alert('請輸入 API 伺服器網址！'); return; }
                vscode.postMessage({ command: 'sendPrompt', apiUrl, text: prompt });
                vscode.setState({ apiUrl, lastPrompt: prompt });
            });
            window.addEventListener('message', event => {
                if (event.data.command === 'showResponse') {
                    document.getElementById('response').innerText = event.data.text;
                }
            });
        </script>
    </body>
    </html>`;
}
