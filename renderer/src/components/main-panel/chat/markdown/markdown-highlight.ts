import { Prism } from './prism';
import I18n from '@/i18n';

const { t } = I18n.global;

// 定义 escapeHtml 函数
function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

interface HighlightOption {
    needTools?: boolean
}

// 导出默认的 highlight 函数
export default function highlight(option: HighlightOption = {}) {
    const {
        needTools = true
    } = option;

    return (str: string, lang: string) => {

        if (needTools) {
            // 代码块容器（无 header，复制按钮为右上角图标、悬停显示）
            let container = `<div class="openmcp-code-block">`;
            container += `<button type="button" class="copy-button copy-button--icon" onclick="copyCode(this)" title="${escapeHtml(t('copy'))}"><span class="iconfont icon-copy"></span></button>`;

            if (lang && Prism.languages[lang]) {
                const highlightedCode = Prism.highlight(str, Prism.languages[lang], lang);
                container += `<pre class="language-${lang}"><code class="language-${lang}">${highlightedCode}</code></pre>`;
            } else {
                container += `<pre class="language-none"><code>${escapeHtml(str)}</code></pre>`;
            }

            container += `</div>`;
            return container;
        } else {
            return Prism.highlight(str, Prism.languages[lang], lang);
        }
    }
}


// 图标复制按钮的原始内容，用于复制成功后恢复
const COPY_ICON_HTML = '<span class="iconfont icon-copy"></span>';
const COPIED_ICON_HTML = '<span class="iconfont icon-dui"></span>';

// 全局复制函数
(window as any).copyCode = function (button: HTMLElement) {
    const codeBlock = button.closest('.openmcp-code-block');
    if (!codeBlock) return;
    const codeElement = codeBlock.querySelector('code');
    const code = codeElement?.textContent || '';

    const thisWindow = window as any;
    if (!thisWindow?.navigator?.clipboard) return;

    navigator.clipboard.writeText(code).then(() => {
        const isIconBtn = button.classList.contains('copy-button--icon');
        if (isIconBtn) {
            const origTitle = button.getAttribute('title');
            button.innerHTML = COPIED_ICON_HTML;
            button.setAttribute('title', t('copied'));
            setTimeout(() => {
                button.innerHTML = COPY_ICON_HTML;
                button.setAttribute('title', origTitle || t('copy'));
            }, 800);
        } else {
            const originalText = button.textContent;
            button.textContent = t('copied');
            setTimeout(() => { button.textContent = originalText; }, 500);
        }
    }).catch((err) => {
        console.error('复制失败:', err);
        if (button.classList.contains('copy-button--icon')) {
            button.setAttribute('title', t('fail-to-copy'));
            setTimeout(() => button.setAttribute('title', t('copy')), 1500);
        } else {
            button.textContent = t('fail-to-copy');
        }
    });
};