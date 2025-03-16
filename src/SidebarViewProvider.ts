import * as vscode from 'vscode';
import fetch from 'node-fetch';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
    // 必須和 package.json 裡 "views" -> "id": "devorkAiPrompt_sidebarView" 一致
    public static readonly viewType = 'devorkAiPrompt_sidebarView';

    constructor(private readonly context: vscode.ExtensionContext) {
        console.log('[SidebarViewProvider] constructor called!');
    }

    // 當使用者真正打開 / 聚焦此視圖時，VS Code 會呼叫此方法
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        console.log('[SidebarViewProvider] resolveWebviewView called');

        // 允許 Webview 執行 JavaScript
        webviewView.webview.options = {
            enableScripts: true
        };
        console.log('[SidebarViewProvider] enableScripts set');

        // 設定 Webview HTML
        webviewView.webview.html = this.getHtmlContent();
        console.log('[SidebarViewProvider] set webview HTML');

        // 監聽來自 Webview 的消息
        webviewView.webview.onDidReceiveMessage(async (message) => {
            console.log('[SidebarViewProvider] onDidReceiveMessage:', message);
        
            if (message.command === 'sendPrompt') {
                const { apiUrl, text } = message; // 取得來自 WebView 的 apiUrl
                const response = await this.handlePrompt(apiUrl, text);
                
                webviewView.webview.postMessage({
                    command: 'showResponse',
                    text: response
                });
            }
        });
        
        console.log('[SidebarViewProvider] onDidReceiveMessage set');
    }

    private getHtmlContent(): string {
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
    
            // 初始化時恢復先前的 API 設定
            if (storedState?.apiUrl) {
                apiUrlInput.value = storedState.apiUrl;
            }
            if (storedState?.lastPrompt) {
                promptInput.value = storedState.lastPrompt;
            }
    
            document.getElementById('sendBtn').addEventListener('click', () => {
                const apiUrl = apiUrlInput.value.trim();
                const prompt = promptInput.value.trim();
    
                if (!apiUrl) {
                    alert('請輸入 API 伺服器網址！');
                    return;
                }
    
                vscode.postMessage({ command: 'sendPrompt', apiUrl, text: prompt });
    
                // 存儲 API 伺服器網址和 Prompt
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
    

// 呼叫本地 Ollama API, 如 http://192.168.0.69:11434/v1/chat/completions
private chatHistory: { role: "user" | "assistant"; content: string }[] = [];
private summary: string = ""; // 用來存儲對話摘要

private async handlePrompt(apiUrl: string, prompt: string): Promise<string> {
    if (!prompt.trim()) {
        return '請輸入 Prompt。';
    }
    if (!apiUrl.trim()) {
        return '請輸入 API 伺服器網址。';
    }

    try {
        const cleanedApiUrl = apiUrl.replace(/\/$/, "");

        // **將新對話加入歷史**
        this.chatHistory.push({ role: "user", content: prompt });

        // **如果歷史對話超過 5 條，則請 AI 進行摘要**
        if (this.chatHistory.length > 5) {
            this.summary = await this.summarizeChat(apiUrl);
            this.chatHistory = []; // 清空原本的歷史，只保留摘要
        }

        // **組合對話上下文**
        const messages = [
            { role: "system", content: "這是之前的對話摘要：" + this.summary }, // 加入 AI 產生的摘要
            ...this.chatHistory // 保留最新的對話
        ];

        const payload = {
            model: "qwen2.5-coder:3b",
            messages: messages,
            stream: false
        };

        const response = await fetch(`${cleanedApiUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            return `Server Error: ${response.status} ${response.statusText}`;
        }

        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || "AI 沒有回應。";

        // **將 AI 回覆加入歷史**
        this.chatHistory.push({ role: "assistant", content: reply });

        return reply;
    } catch (error: any) {
        return `API 請求錯誤: ${error.message}`;
    }
}
private async summarizeChat(apiUrl: string): Promise<string> {
    try {
        const cleanedApiUrl = apiUrl.replace(/\/$/, "");

        const payload = {
            model: "qwen2.5-coder:3b",
            messages: [
                { role: "system", content: "請根據以下對話內容，產生簡短的摘要，保留重要資訊：" },
                ...this.chatHistory
            ],
            stream: false
        };

        const response = await fetch(`${cleanedApiUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            return `無法產生摘要，錯誤: ${response.status} ${response.statusText}`;
        }

        const data = await response.json();
        return data?.choices?.[0]?.message?.content || "摘要產生失敗。";
    } catch (error: any) {
        return `摘要請求錯誤: ${error.message}`;
    }
}

    
}
