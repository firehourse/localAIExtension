import * as vscode from 'vscode';
import { createSidebarViewProvider, SIDEBAR_VIEW_TYPE } from './SidebarViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('DevorkAiPrompt extension is now active!');

    // 建立並註冊自訂的 Sidebar Provider (Go-style Factory)
    const provider = createSidebarViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SIDEBAR_VIEW_TYPE,
            provider
        )
    );

    // 為了測試方便，我們另外註冊一個命令，用來強制聚焦到 Webview View
    const testFocusCmd = vscode.commands.registerCommand('devorkAiPrompt.testFocus', async () => {
        console.log('devorkAiPrompt.testFocus command triggered');
        await vscode.commands.executeCommand('devorkAiPrompt_sidebarView.focus');
    });

    context.subscriptions.push(testFocusCmd);
}

export function deactivate() {
    console.log('DevorkAiPrompt extension is deactivated!');
}
