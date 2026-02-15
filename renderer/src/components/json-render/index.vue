<template>
    <div :class="['json-render', { 'json-render--with-copy': showCopy }]">
        <div v-if="showCopy" class="json-render-header">
            <span v-if="label" class="json-render-lang">{{ label }}</span>
            <button type="button" class="json-render-copy" @click="handleCopy">
                {{ copied ? t('copied') : t('copy') }}
            </button>
        </div>
        <el-scrollbar
            class="json-render-scrollbar"
            :class="{ 'json-render-scrollbar--no-horizontal': !scrollbarHorizontal }"
            max-height="400px"
        >
            <div
                ref="jsonBodyRef"
                class="json-render-body"
                v-html="bodyHtml"
                @click="onBodyClick"
            >
            </div>
        </el-scrollbar>
        <!-- 长字符串展开弹层：显示去除转义后的标准输出 -->
        <Teleport to="body">
            <template v-if="stringPopover.visible">
                <div
                    class="json-render-string-popover-backdrop"
                    @click="closeStringPopover"
                />
                <div
                    class="json-render-string-popover"
                    :style="stringPopover.style"
                    ref="stringPopoverRef"
                >
                    <div class="json-render-string-popover__header">
                        <el-tooltip :content="t('copy')" placement="top">
                            <button type="button" class="json-render-string-popover__copy" @click="copyPopoverContent">
                                <span class="iconfont icon-copy"></span>
                            </button>
                        </el-tooltip>
                    </div>
                    <el-scrollbar class="json-render-string-popover__scroll">
                        <div class="json-render-string-popover__content">
                            <pre class="json-render-string-popover__pre">{{ stringPopoverDisplayContent }}</pre>
                        </div>
                    </el-scrollbar>
                </div>
            </template>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onUpdated } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { renderJson } from '../main-panel/chat/markdown/markdown';

const { t } = useI18n();
const jsonBodyRef = ref<HTMLElement | null>(null);
const stringPopoverRef = ref<HTMLElement | null>(null);
const copied = ref(false);

const props = withDefaults(
    defineProps<{
        json: any;
        showCopy?: boolean;
        label?: string;
        /** 是否在内部渲染横向滚动条，默认 true；设为 false 时由外部滚动容器负责横向滚动 */
        scrollbarHorizontal?: boolean;
    }>(),
    { showCopy: false, label: '', scrollbarHorizontal: true }
);

const bodyHtml = computed(() => renderJson(props.json));

/** 弹层展示内容：若为合法 JSON 则按两空格缩进格式化，否则原样显示 */
const stringPopoverDisplayContent = computed(() => {
    const c = stringPopover.value.content;
    try {
        const parsed = JSON.parse(c);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return c;
    }
});

/** 将 JSON 字符串中的转义序列解析为标准输出（\n \t \r \\ \" \/ \uXXXX 等） */
function unescapeJsonString(s: string): string {
    s = s.trim();
    if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
        s = s.slice(1, -1);
    }
    let out = '';
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '\\') {
            out += s[i];
            continue;
        }
        const next = s[i + 1];
        if (next === 'n') {
            out += '\n';
            i++;
        } else if (next === 'r') {
            out += '\r';
            i++;
        } else if (next === 't') {
            out += '\t';
            i++;
        } else if (next === '\\') {
            out += '\\';
            i++;
        } else if (next === '"') {
            out += '"';
            i++;
        } else if (next === '/') {
            out += '/';
            i++;
        } else if (next === 'b') {
            out += '\b';
            i++;
        } else if (next === 'f') {
            out += '\f';
            i++;
        } else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
            out += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
            i += 5;
        } else {
            out += s[i];
        }
    }
    return out;
}

const expandableContentMap = new WeakMap<Element, string>();

const stringPopover = ref<{
    visible: boolean;
    content: string;
    style: { left: string; top: string };
}>({
    visible: false,
    content: '',
    style: { left: '0', top: '0' }
});

function closeStringPopover() {
    stringPopover.value = {
        ...stringPopover.value,
        visible: false
    };
}

async function copyPopoverContent() {
    const text = stringPopoverDisplayContent.value;
    try {
        await navigator.clipboard.writeText(text);
        ElMessage.success(t('copied'));
    } catch {
        ElMessage.error(t('copy-failed'));
    }
}

function clearExpandableStrings(root: HTMLElement) {
    root.querySelectorAll('.json-render-string-expandable').forEach((el) => {
        el.classList.remove('json-render-string-expandable');
        (el as HTMLElement).removeAttribute('title');
    });
}

function attachExpandableStrings(root: HTMLElement) {
    clearExpandableStrings(root);
    const tokens = root.querySelectorAll('.token.string');
    tokens.forEach((el) => {
        const text = (el as HTMLElement).textContent || '';
        el.classList.add('json-render-string-expandable');
        (el as HTMLElement).setAttribute('title', t('json-string-click-to-expand'));
        expandableContentMap.set(el, unescapeJsonString(text));
    });
}

function onBodyClick(e: MouseEvent) {
    const target = (e.target as HTMLElement).closest('.json-render-string-expandable');
    if (!target || !jsonBodyRef.value) return;
    const content = expandableContentMap.get(target);
    if (content === undefined) return;
    const rect = (target as HTMLElement).getBoundingClientRect();
    const gap = 8;
    const maxW = 560;
    const maxH = 320;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const showBelow = spaceBelow >= maxH || spaceBelow >= spaceAbove;
    let top: number;
    if (showBelow) {
        top = rect.bottom + gap;
    } else {
        top = Math.max(gap, rect.top - maxH - gap);
    }
    let left = rect.left;
    if (left + maxW > window.innerWidth) {
        left = window.innerWidth - maxW - gap;
    }
    if (left < gap) left = gap;
    if (top + maxH > window.innerHeight) {
        top = Math.max(gap, window.innerHeight - maxH - gap);
    }
    stringPopover.value = {
        visible: true,
        content,
        style: {
            left: left + 'px',
            top: top + 'px'
        }
    };
}

watch(
    () => props.json,
    () => {
        nextTick(() => {
            if (jsonBodyRef.value) attachExpandableStrings(jsonBodyRef.value);
        });
    },
    { immediate: true }
);

// 每次 DOM 更新后重新绑定可点击展开（解决响应区等异步内容或父组件重渲染后不生效的问题）
onUpdated(() => {
    nextTick(() => {
        if (jsonBodyRef.value) attachExpandableStrings(jsonBodyRef.value);
    });
    // 延迟再绑定一次，解决从其他 tab 切换到 JSON 时 DOM 尚未就绪导致不生效的问题（如工具调试页）
    setTimeout(() => {
        if (jsonBodyRef.value) attachExpandableStrings(jsonBodyRef.value);
    }, 150);
});

function getRawText(): string {
    if (!jsonBodyRef.value) return '';
    const codeEl = jsonBodyRef.value.querySelector('code');
    return codeEl?.textContent?.trim() ?? '';
}

async function handleCopy() {
    const text = getRawText() || JSON.stringify(props.json, null, 2);
    try {
        await navigator.clipboard.writeText(text);
        copied.value = true;
        setTimeout(() => (copied.value = false), 1500);
    } catch {
        copied.value = false;
    }
}
</script>

<style scoped>
.json-render {
    font-family: var(--font-monospace-family, var(--code-font-family, monospace));
    font-size: 13px;
    line-height: 1.6;
    letter-spacing: 0.02em;
}

.json-render--with-copy {
    border: 1px solid var(--sidebar-item-border);
    border-radius: 8px;
    overflow: hidden;
    background-color: var(--sidebar-item-selected);
}

.json-render-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    background: var(--sidebar-item-background);
    border-bottom: 1px solid var(--sidebar-item-border);
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
}

.json-render-copy {
    margin-left: auto;
    padding: 2px 10px;
    border: 1px solid var(--sidebar-item-border);
    border-radius: 6px;
    background: transparent;
    color: var(--foreground);
    cursor: pointer;
    font-size: 12px;
    transition: var(--animation-3s);
}

.json-render-copy:hover {
    background: var(--sidebar-item-hover);
}

.json-render-scrollbar {
    flex: 1;
    --el-scrollbar-opacity: 0.3;
}

.json-render-scrollbar--no-horizontal :deep(.el-scrollbar__wrap) {
    overflow-x: hidden;
}
.json-render-scrollbar--no-horizontal :deep(.el-scrollbar__bar.is-horizontal) {
    display: none;
}

.json-render-body {
    padding: 12px 14px;
    display: inline-block;
    min-width: 100%;
}

.json-render-body :deep(pre) {
    margin: 0;
    padding: 0;
    background: transparent !important;
    overflow: visible;
}

.json-render-body :deep(code) {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre;
    display: block;
}

/* .token.string：悬停高亮 + 点击展开（弹层在元素上下方） */
.json-render-body :deep(.token.string.json-render-string-expandable) {
    cursor: pointer;
    border-radius: 3px;
    padding: 1px 2px;
    margin: -1px -2px;
}
.json-render-body :deep(.token.string.json-render-string-expandable:hover) {
    background: var(--el-fill-color-light);
    outline: 1px solid var(--el-border-color-lighter);
}

/* 展开弹层：在元素上下方显示，el-scrollbar 固定高度，内容为去转义后文本或格式化 JSON */
.json-render-string-popover {
    position: fixed;
    z-index: 2000;
    width: 560px;
    max-width: calc(100vw - 24px);
    height: 320px;
    background: var(--el-bg-color-overlay);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    box-shadow: var(--el-box-shadow-light);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
.json-render-string-popover__header {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-light);
}
.json-render-string-popover__copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    font-size: 14px;
}
.json-render-string-popover__copy:hover {
    color: var(--el-text-color-regular);
    background: var(--el-border-color-lighter);
}
.json-render-string-popover__scroll {
    flex: 1;
    min-height: 0;
}
.json-render-string-popover__scroll :deep(.el-scrollbar__wrap) {
    overflow-x: auto;
}
.json-render-string-popover__content {
    padding: 10px 12px;
}
.json-render-string-popover__pre {
    margin: 0;
    font-family: var(--font-monospace-family, var(--code-font-family, monospace));
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--el-text-color-primary);
}
.json-render-string-popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1999;
    background: transparent;
}
</style>