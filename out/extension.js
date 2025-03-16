"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const SidebarViewProvider_1 = require("./SidebarViewProvider");
function activate(context) {
    console.log('DevorkAiPrompt extension is now active!');
    // 建立並註冊一個自訂的 WebviewViewProvider，讓 VS Code 知道怎麼在側邊欄顯示 Webview
    const provider = new SidebarViewProvider_1.SidebarViewProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(SidebarViewProvider_1.SidebarViewProvider.viewType, provider));
    // 為了測試方便，我們另外註冊一個命令，用來強制聚焦到 Webview View
    // 你可以在命令面板 (Ctrl+Shift+P) 輸入「AI Prompt: Test Focus」來執行
    const testFocusCmd = vscode.commands.registerCommand('devorkAiPrompt.testFocus', () => __awaiter(this, void 0, void 0, function* () {
        console.log('devorkAiPrompt.testFocus command triggered');
        yield vscode.commands.executeCommand('devorkAiPrompt_sidebarView.focus');
    }));
    context.subscriptions.push(testFocusCmd);
}
exports.activate = activate;
function deactivate() {
    console.log('DevorkAiPrompt extension is deactivated!');
}
exports.deactivate = deactivate;
