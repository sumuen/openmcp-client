/**
 * 键盘快捷键工具：支持 Mac（⌘）与 Windows/Linux（Ctrl）兼容
 */

/** 检测是否为 Mac 平台（用于显示 ⌘ 而非 Ctrl） */
export function isMacPlatform(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform) || navigator.platform === '';
}

/**
 * 检测是否为 Ctrl+Enter 或 Cmd+Enter（Mac）
 */
export function isModEnter(e: KeyboardEvent): boolean {
    return (e.ctrlKey || e.metaKey) && e.key === 'Enter';
}

/**
 * 获取「执行/运行」快捷键的显示文本：Mac 显示 ⌘+Enter，其他显示 Ctrl+Enter
 */
export function getModEnterShortcutText(): string {
    return isMacPlatform() ? '⌘ + Enter' : 'Ctrl + Enter';
}
