import fetch from 'node-fetch';
import * as vscode from 'vscode';

/**
 * AgentState 就像 Go 的 Struct，存放 Agent 的核心資料狀態
 */
export interface AgentState {
    chatHistory: { role: "user" | "assistant"; content: string }[];
    summary: string;
}

/**
 * 建立初始狀態 (像 s := &AgentState{...})
 */
export function createAgentState(): AgentState {
    return {
        chatHistory: [],
        summary: ""
    };
}

/**
 * 處理 AI Prompt
 * 就像 Go 的 func (s *AgentState) HandlePrompt(apiUrl, prompt string)
 */
export async function handlePrompt(state: AgentState, apiUrl: string, prompt: string): Promise<string> {
    if (!prompt.trim()) return '請輸入 Prompt。';
    if (!apiUrl.trim()) return '請輸入 API 伺服器網址。';

    try {
        const cleanedApiUrl = apiUrl.replace(/\/$/, "");

        // 將新對話加入歷史
        state.chatHistory.push({ role: "user", content: prompt });

        // 如果歷史對話超過 5 條，則進行摘要
        if (state.chatHistory.length > 5) {
            state.summary = await summarizeChat(state, apiUrl);
            state.chatHistory = [];
        }

        // 組合對話上下文
        const messages = [
            { role: "system", content: "這是之前的對話摘要：" + state.summary },
            ...state.chatHistory
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

        // 將 AI 回覆加入歷史
        state.chatHistory.push({ role: "assistant", content: reply });

        return reply;
    } catch (error: any) {
        return `API 請求錯誤: ${error.message}`;
    }
}

/**
 * 產生對話摘要
 * 就像 Go 的 func (s *AgentState) SummarizeChat(apiUrl string)
 */
async function summarizeChat(state: AgentState, apiUrl: string): Promise<string> {
    try {
        const cleanedApiUrl = apiUrl.replace(/\/$/, "");

        const payload = {
            model: "qwen2.5-coder:3b",
            messages: [
                { role: "system", content: "請根據以下對話內容，產生簡短的摘要，保留重要資訊：" },
                ...state.chatHistory
            ],
            stream: false
        };

        const response = await fetch(`${cleanedApiUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        return data?.choices?.[0]?.message?.content || "摘要產生失敗。";
    } catch (error: any) {
        return `摘要請求錯誤: ${error.message}`;
    }
}
