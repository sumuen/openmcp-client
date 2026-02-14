<template>
    <div style="padding: 10px;">
        <div class="resource-executor-header">
            <el-tree-select
                v-if="props.tabId >= 0"
                v-model="selectedResourceValue"
                :data="resourceTreeData"
                :render-after-expand="false"
                :placeholder="t('select-resource')"
                :render-content="renderResourceSelectContent"
                popper-class="resource-tree-select-dropdown"
                class="resource-tree-select"
            />
            <span v-else class="resource-executor-title">{{ currentResource?.name || '' }}</span>
        </div>
        <div class="resource-reader-container">
        <el-form :model="tabStorage.formData" :rules="formRules" ref="formRef" label-position="top">
            <el-form-item v-for="param in currentResource?.params" :key="param" :label="param"
                :prop="param">
                <el-input v-model="tabStorage.formData[param]"
                    :placeholder="t('enter') + ' ' + param"
                    @keydown.enter.prevent="handleSubmit"
                />
            </el-form-item>

            <el-form-item v-if="tabStorage.currentType === 'template'">
                <el-button type="primary" :loading="loading" @click="handleSubmit">
                    {{ t('read-resource') }}
                </el-button>
                <el-button @click="resetForm">
                    {{ t('reset') }}
                </el-button>
            </el-form-item>
            <el-form-item v-else>
                <el-button @click="handleSubmit">
                    {{ t("refresh") }}
                </el-button>
            </el-form-item>
        </el-form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineComponent, defineProps, watch, ref, computed, reactive, defineEmits, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FormInstance, FormRules } from 'element-plus';
import { tabs } from '../panel';
import { parseResourceTemplate, type ResourceStorage } from './resources';
import type{ ResourcesReadResponse } from '@/hook/type';
import { getDefaultValue, normaliseJavascriptType } from '@/hook/mcp';
import { mcpClientAdapter } from '@/views/connect/core';

defineComponent({ name: 'resource-reader' });

const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    },
    currentResourceName: {
        type: String,
        required: false
    }
});

const emits = defineEmits(['resource-get-response']);

let tabStorage: ResourceStorage;

if (props.tabId >= 0) {
    const tab = tabs.content[props.tabId];
    tabStorage = tab.storage as ResourceStorage;
} else {
    tabStorage = reactive({
        activeNames: [0],
		templateActiveNames: [0],
        currentType: 'resource',
        currentResourceName: props.currentResourceName || '',
        formData: {},
        lastResourceReadResponse: undefined
    });
}

if (!tabStorage.formData) {
    tabStorage.formData = {};
}

// 表单相关状态
const formRef = ref<FormInstance>();
const loading = ref(false);
const responseData = ref<ResourcesReadResponse>();

const RESOURCE_VALUE_SEP = '::';

function renderResourceSelectContent(h: any, { data }: { data: { label: string; description?: string } }) {
    return h('div', { class: 'tree-select-node-content' }, [
        h('div', { class: 'tree-select-node-label' }, data.label),
        data.description ? h('div', { class: 'tree-select-node-desc' }, data.description) : null
    ]);
}

interface TreeNode {
    label: string;
    value: string;
    description?: string;
    children?: TreeNode[];
    disabled?: boolean;
}

/** 三层树：一级 resources/list 与 resources/templates/list，二级 MCP 服务器，三级为具体资源或模板项；仅第三层可选 */
const resourceTreeData = computed(() => {
    const resourceListChildren: TreeNode[] = mcpClientAdapter.clients.map((client, index) => {
        const items: TreeNode[] = [];
        client.resources?.forEach((r) => {
            items.push({
                label: r.name,
                value: `resource${RESOURCE_VALUE_SEP}${index}${RESOURCE_VALUE_SEP}${r.name}`,
                description: r.mimeType || ''
            });
        });
        return {
            label: client.name,
            value: `server-resource-${index}`,
            disabled: true,
            children: items
        };
    });
    const templateListChildren: TreeNode[] = mcpClientAdapter.clients.map((client, index) => {
        const items: TreeNode[] = [];
        client.resourceTemplates?.forEach((t) => {
            items.push({
                label: t.name,
                value: `template${RESOURCE_VALUE_SEP}${index}${RESOURCE_VALUE_SEP}${t.name}`,
                description: t.description || ''
            });
        });
        return {
            label: client.name,
            value: `server-template-${index}`,
            disabled: true,
            children: items
        };
    });
    return [
        {
            label: 'resources/list',
            value: 'root-resource',
            disabled: true,
            children: resourceListChildren
        },
        {
            label: 'resources/templates/list',
            value: 'root-template',
            disabled: true,
            children: templateListChildren
        }
    ] as TreeNode[];
});

const selectedResourceValue = computed({
    get() {
        const name = tabStorage.currentResourceName;
        if (!name || props.tabId < 0) return '';
        const type = tabStorage.currentType;
        const idx = tabStorage.currentClientIndex;
        if (idx !== undefined && idx >= 0 && idx < mcpClientAdapter.clients.length) {
            const client = mcpClientAdapter.clients[idx];
            if (type === 'resource' && client.resources?.has(name))
                return `resource${RESOURCE_VALUE_SEP}${idx}${RESOURCE_VALUE_SEP}${name}`;
            if (type === 'template' && client.resourceTemplates?.has(name))
                return `template${RESOURCE_VALUE_SEP}${idx}${RESOURCE_VALUE_SEP}${name}`;
        }
        for (let i = 0; i < mcpClientAdapter.clients.length; i++) {
            const client = mcpClientAdapter.clients[i];
            if (client.resources?.get(name))
                return `resource${RESOURCE_VALUE_SEP}${i}${RESOURCE_VALUE_SEP}${name}`;
            if (client.resourceTemplates?.get(name))
                return `template${RESOURCE_VALUE_SEP}${i}${RESOURCE_VALUE_SEP}${name}`;
        }
        return '';
    },
    set(val: string) {
        if (!val || !val.includes(RESOURCE_VALUE_SEP)) return;
        if (val === 'root-resource' || val === 'root-template' || val.startsWith('server-')) return;
        const parts = val.split(RESOURCE_VALUE_SEP);
        if (parts.length < 3) return;
        const type = parts[0] as 'resource' | 'template';
        const i = Number(parts[1]);
        const name = parts.slice(2).join(RESOURCE_VALUE_SEP);
        if ((type === 'resource' || type === 'template') && !Number.isNaN(i) && name) {
            tabStorage.currentClientIndex = i;
            tabStorage.currentType = type;
            tabStorage.currentResourceName = name;
            tabStorage.lastResourceReadResponse = undefined;
        }
    }
});

// 当前 resource 的模板参数（优先 currentClientIndex）
const currentResource = computed(() => {
    if (props.tabId >= 0 && tabStorage.currentClientIndex !== undefined && tabStorage.currentClientIndex >= 0) {
        const client = mcpClientAdapter.clients[tabStorage.currentClientIndex];
        if (client) {
            const resource = client.resources?.get(tabStorage.currentResourceName);
            if (resource) {
                return {
                    name: resource.name,
                    template: resource,
                    params: [],
                    fill: () => ''
                };
            }
            const resourceTemplate = client.resourceTemplates?.get(tabStorage.currentResourceName);
            if (resourceTemplate) {
                const { params, fill } = parseResourceTemplate(resourceTemplate.uriTemplate);
                return { name: resourceTemplate.name, template: resourceTemplate, params, fill };
            }
        }
    }
    for (const client of mcpClientAdapter.clients) {
        const resource = client.resources?.get(tabStorage.currentResourceName);
        if (resource) {
            return { name: resource.name, template: resource, params: [], fill: () => '' };
        }
        const resourceTemplate = client.resourceTemplates?.get(tabStorage.currentResourceName);
        if (resourceTemplate) {
            const { params, fill } = parseResourceTemplate(resourceTemplate.uriTemplate);
            return { name: resourceTemplate.name, template: resourceTemplate, params, fill };
        }
    }
});

// 表单验证规则
const formRules = computed<FormRules>(() => {
    const rules: FormRules = {}
    currentResource.value?.params.forEach(param => {
        rules[param] = [
            {
                message: `${param} ` + t('is-required'),
                trigger: 'blur'
            }
        ]
    });

    return rules;
});

// 初始化表单数据
const initFormData = () => {
    if (!currentResource.value?.params) {
        return;
    }

    const newSchemaDataForm: Record<string, number | boolean | string> = {};
    currentResource.value.params.forEach(param => {
        newSchemaDataForm[param] = '';
        if (tabStorage.formData[param] !== undefined) {
            newSchemaDataForm[param] = tabStorage.formData[param];
        }
    });

    tabStorage.formData = newSchemaDataForm;
}

// 重置表单
const resetForm = () => {
    formRef.value?.resetFields();
    responseData.value = undefined;
}

function getUri() {
    if (tabStorage.currentType === 'template') {
        const fillFn = currentResource.value?.fill || ((str: any) => str);
        const uri = fillFn(tabStorage.formData);
        return uri;
    }
    if (tabStorage.currentClientIndex !== undefined && tabStorage.currentClientIndex >= 0) {
        const client = mcpClientAdapter.clients[tabStorage.currentClientIndex];
        const resource = client?.resources?.get(tabStorage.currentResourceName);
        if (resource) return resource.uri;
    }
    for (const client of mcpClientAdapter.clients) {
        const resource = client.resources?.get(tabStorage.currentResourceName);
        if (resource) return resource.uri;
    }
}

// 提交表单
async function handleSubmit() {
    const uri = getUri();
    const clientIndex = props.tabId >= 0 ? tabStorage.currentClientIndex : undefined;
    const res = await mcpClientAdapter.readResource(uri, clientIndex);
    tabStorage.lastResourceReadResponse = res;
    emits('resource-get-response', res);
}

if (props.tabId >= 0) {
    watch(() => [tabStorage.currentResourceName, tabStorage.currentType], () => {
        initFormData();
        resetForm();
    }, { immediate: true });
}

onMounted(() => {
    if (props.tabId >= 0 && !tabStorage.currentResourceName && resourceTreeData.value.length > 0) {
        for (const root of resourceTreeData.value) {
            const servers = root.children || [];
            for (const server of servers) {
                const items = server.children || [];
                const firstLeaf = items[0];
                if (firstLeaf && typeof firstLeaf.value === 'string' && firstLeaf.value.includes(RESOURCE_VALUE_SEP)) {
                    const parts = firstLeaf.value.split(RESOURCE_VALUE_SEP);
                    if (parts.length >= 3) {
                        const type = parts[0] as 'resource' | 'template';
                        const i = Number(parts[1]);
                        const name = parts.slice(2).join(RESOURCE_VALUE_SEP);
                        if (!Number.isNaN(i) && name) {
                            tabStorage.currentClientIndex = i;
                            tabStorage.currentType = type;
                            tabStorage.currentResourceName = name;
                        }
                    }
                    break;
                }
            }
            if (tabStorage.currentResourceName) break;
        }
    }
    initFormData();
});
</script>

<style>
.resource-executor-header {
    margin-bottom: 12px;
}

.resource-executor-header .resource-tree-select {
    width: 100%;
    max-width: 420px;
}

.resource-executor-title {
    font-weight: 500;
    font-size: 14px;
    color: var(--el-text-color-primary);
}

.tree-select-node-content {
    padding: 2px 0;
    min-width: 0;
}

.tree-select-node-label {
    font-weight: 500;
    margin-bottom: 4px;
}

.tree-select-node-desc {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    opacity: 0.85;
    line-height: 1.4;
    margin-top: 2px;
    max-width: 320px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

.resource-tree-select-dropdown.el-select-dropdown .el-select-dropdown__item {
    height: auto;
    min-height: 32px;
    padding: 6px 12px;
    white-space: normal;
}

.resource-reader-container {
    background-color: var(--background);
    padding: 10px 12px;
    border-radius: .5em;
    margin-bottom: 15px;
}
</style>