<template>
    <div class="variable-extraction">
        <h3>
            <span class="iconfont icon-variable"></span>
            变量提取
        </h3>

        <div class="tips">
            <p>每行包含两个输入：左侧为 JSONPath 表达式，右侧为变量名称。</p>
            <p>示例 JSONPath：<code>$</code>（整个结果）、<code>$.data.id</code>、<code>$.items[0].name</code></p>
            <p>
                JSONPath 参考：<a href="https://goessner.net/articles/JsonPath/" target="_blank">规范</a>
            </p>
        </div>

        <div class="rule-list">
            <div class="rule-header">
                <div class="col path">JSONPath</div>
                <div class="col name">变量名称</div>
                <div class="col ops">操作</div>
            </div>
            <div class="rule-row" v-for="(row, idx) in rows" :key="idx">
                <el-input v-model="row.path" placeholder="如 $.data.id" class="col path" />
                <el-input v-model="row.name" placeholder="如 user_id" class="col name" />
                <div class="col ops">
                    <el-button circle @click="removeRow(idx)"><span class="iconfont icon-delete"></span></el-button>
                </div>
            </div>
            <div class="rule-actions">
                <el-button class="add-row-btn" type="primary" plain @click="addRow"><span class="iconfont icon-add"></span> 新增一行</el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, defineProps, computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { tabs } from '../../../panel';
import type { ToolStorage } from '../../tools';
import { JSONPath } from 'jsonpath-plus';
import { initVariableStore, getVariables, createVariable, updateVariable } from '../../variable-management/store';
import type { ToolVariable } from '../../variable-management/types';
import { mcpClientAdapter } from '@/views/connect/core';

defineComponent({ name: 'variable-extraction' });

const props = defineProps({
    tabId: { type: Number, required: true }
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as ToolStorage;

// 确保变量存储初始化
try { initVariableStore(mcpClientAdapter.masterNode); } catch { /* 已初始化忽略 */ }

const currentToolName = computed(() => tabStorage.currentToolName);

// 每个工具独立的提取规则列表
type RuleItem = { path: string; name: string };
const rows = ref<RuleItem[]>([]);

function getStorageList(): RuleItem[] {
    const key = currentToolName.value || '__unknown__';
    tabStorage.variableExtractionList = tabStorage.variableExtractionList || {};
    return tabStorage.variableExtractionList[key] || (tabStorage.variableExtractionList[key] = []);
}

function loadRowsFromStorage() {
    const list = getStorageList();
    rows.value = list.map(r => ({ ...r }));
}

// 切换工具时加载对应规则
watch(currentToolName, () => loadRowsFromStorage(), { immediate: true });

// 双向同步：编辑行时写回存储（过滤空白）
watch(rows, (v) => {
    const cleaned = v
        .filter(r => (r.path?.trim() || '') && (r.name?.trim() || ''))
        .map(r => ({ path: r.path.trim(), name: r.name.trim() }));
    const key = currentToolName.value || '__unknown__';
    tabStorage.variableExtractionList = tabStorage.variableExtractionList || {};
    tabStorage.variableExtractionList[key] = cleaned;
}, { deep: true });

const lastResult = computed(() => tabStorage.lastToolCallResponse);

watch(lastResult, () => {
    // 清理无效结果时，不做任何操作
    if (lastResult.value === undefined || lastResult.value === null) return;
    extractFromLastResult();
}, { immediate: true });


function currentRulesWithLine(): Array<{ path: string; name: string; line: number }>{
    return rows.value.map((r, i) => ({ path: r.path, name: r.name, line: i + 1 }));
}

function getTypeOfValue(v: any): ToolVariable['type'] {
    if (v === null) return 'null' as any;
    if (Array.isArray(v)) return 'array' as any;
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return t as any;
    return 'object' as any;
}

function upsertVariableByName(name: string, value: any, description?: string) {
    const existing = getVariables().find(v => v.name === name);
    const type = getTypeOfValue(value);
    if (existing) {
        updateVariable(existing.id, { value: JSON.stringify(value), type, description: description || existing.description });
    } else {
        createVariable(name, type as any, value, { description, tags: ['extracted', currentToolName.value || 'unknown'] });
    }
}

function toJsonForPathInput(val: any): any {
    // lastResult 可能是字符串（JSON 字符串）；尽量解析
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
    }
    return val;
}

function extractFromLastResult() {
    const rules = currentRulesWithLine();
    if (rules.length === 0) {
        ElMessage.warning('没有有效规则');
        return;
    }

    const src = toJsonForPathInput(lastResult.value);
    let success = 0;
    let fail = 0;
    for (const r of rules) {
        try {
            const value = JSONPath({ path: r.path, json: src, wrap: false, resultType: 'value' as any });
            // JSONPath-Plus 在 wrap:false 时，可能返回单值或数组；我们统一保留其原样
            if (value === undefined) {
                fail++;
                continue;
            }
            upsertVariableByName(r.name, value, `[提取] ${currentToolName.value || ''} ${r.path}`);
            success++;
        } catch (e) {
            console.warn('Extract error at line', r.line, e);
            fail++;
        }
    }
    if (success > 0) ElMessage.success(`提取完成：成功 ${success}，失败 ${fail}`);
    else ElMessage.warning(`未能提取任何变量（失败 ${fail}）`);
}

function addRow() {
    rows.value = [...rows.value, { path: '', name: '' }];
}

function removeRow(idx: number) {
    const list = rows.value.slice();
    list.splice(idx, 1);
    rows.value = list;
}
</script>

<style scoped>
.variable-extraction {
    padding: 10px 0;
}

.tips {
    font-size: 12px;
    color: var(--text-color, #cfd3dc);
    margin-bottom: 10px;
}

.rule-list {
    background: var(--background);
    padding: 12px;
    border-radius: 8px;
}

.rule-header,
.rule-row {
    display: grid;
    grid-template-columns: 1fr 1fr 80px;
    gap: 8px;
    align-items: center;
}

.rule-header {
    font-size: 12px;
    color: #9aa4af;
    margin-bottom: 8px;
}

.rule-row + .rule-row { margin-top: 8px; }

.col.ops { display: flex; align-items: center; gap: 6px; }

.rule-actions { 
    margin-top: 10px; 
    color: #cfd3dc !important;
}

/* 覆盖 Element Plus 按钮文字颜色（scoped 下需要 :deep） */
.rule-actions :deep(.add-row-btn) {
    --el-button-text-color: #cfd3dc;
    --el-button-hover-text-color: #cfd3dc;
    --el-button-active-text-color: #cfd3dc;
    --el-button-disabled-text-color: #cfd3dc;
}

.actions {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
}

.preview {
    margin-top: 8px;
}

.result-preview {
    max-height: 240px;
    overflow: auto;
    white-space: pre-wrap;
}

.mb-12 { margin-bottom: 12px; }
</style>