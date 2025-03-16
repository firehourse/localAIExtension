"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarViewProvider = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class SidebarViewProvider {
    constructor(context) {
        this.context = context;
        // 呼叫本地 Ollama API, 如 http://192.168.0.69:11434/v1/chat/completions
        this.chatHistory = [];
        this.summary = ""; // 用來存儲對話摘要
        console.log('[SidebarViewProvider] constructor called!');
    }
    // 當使用者真正打開 / 聚焦此視圖時，VS Code 會呼叫此方法
    resolveWebviewView(webviewView, _context, _token) {
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
        webviewView.webview.onDidReceiveMessage((message) => __awaiter(this, void 0, void 0, function* () {
            console.log('[SidebarViewProvider] onDidReceiveMessage:', message);
            if (message.command === 'sendPrompt') {
                const { apiUrl, text } = message; // 取得來自 WebView 的 apiUrl
                const response = yield this.handlePrompt(apiUrl, text);
                webviewView.webview.postMessage({
                    command: 'showResponse',
                    text: response
                });
            }
        }));
        console.log('[SidebarViewProvider] onDidReceiveMessage set');
    }
    getHtmlContent() {
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
    handlePrompt(apiUrl, prompt) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
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
                    this.summary = yield this.summarizeChat(apiUrl);
                    this.chatHistory = []; // 清空原本的歷史，只保留摘要
                }
                // **組合對話上下文**
                const messages = [
                    { role: "system", content: "這是之前的對話摘要：" + this.summary },
                    ...this.chatHistory // 保留最新的對話
                ];
                const payload = {
                    model: "qwen2.5-coder:3b",
                    messages: messages,
                    stream: false
                };
                const response = yield (0, node_fetch_1.default)(`${cleanedApiUrl}/v1/chat/completions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    return `Server Error: ${response.status} ${response.statusText}`;
                }
                const data = yield response.json();
                const reply = ((_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "AI 沒有回應。";
                // **將 AI 回覆加入歷史**
                this.chatHistory.push({ role: "assistant", content: reply });
                return reply;
            }
            catch (error) {
                return `API 請求錯誤: ${error.message}`;
            }
        });
    }
    summarizeChat(apiUrl) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
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
                const response = yield (0, node_fetch_1.default)(`${cleanedApiUrl}/v1/chat/completions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    return `無法產生摘要，錯誤: ${response.status} ${response.statusText}`;
                }
                const data = yield response.json();
                return ((_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "摘要產生失敗。";
            }
            catch (error) {
                return `摘要請求錯誤: ${error.message}`;
            }
        });
    }
}
exports.SidebarViewProvider = SidebarViewProvider;
// 必須和 package.json 裡 "views" -> "id": "devorkAiPrompt_sidebarView" 一致
SidebarViewProvider.viewType = 'devorkAiPrompt_sidebarView';
