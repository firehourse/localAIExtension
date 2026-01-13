import * as vscode from 'vscode';
import { SidebarViewProvider } from './SidebarViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('DevorkAiPrompt extension is now active!');

    // 建立並註冊一個自訂的 WebviewViewProvider，讓 VS Code 知道怎麼在側邊欄顯示 Webview
    const provider = new SidebarViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarViewProvider.viewType,
            provider
        )
    );

    // 為了測試方便，我們另外註冊一個命令，用來強制聚焦到 Webview View
    // 你可以在命令面板 (Ctrl+Shift+P) 輸入「AI Prompt: Test Focus」來執行
    const testFocusCmd = vscode.commands.registerCommand('devorkAiPrompt.testFocus', async () => {
        console.log('devorkAiPrompt.testFocus command triggered');
        await vscode.commands.executeCommand('devorkAiPrompt_sidebarView.focus');
    });

    context.subscriptions.push(testFocusCmd);
}

export function deactivate() {
    console.log('DevorkAiPrompt extension is deactivated!');
}
