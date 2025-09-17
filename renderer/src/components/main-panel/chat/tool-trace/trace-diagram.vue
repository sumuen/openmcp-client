<template>
    <div class="trace-diagram-container">
        <div ref="svgContainer" class="diagram-container"></div>
        
        <!-- 节点详情弹窗 -->
        <el-dialog 
            v-model="nodeDetailVisible" 
            :title="selectedNodeData?.name || 'Node Details'" 
            width="600px"
            :before-close="handleDialogClose"
        >
            <div v-if="selectedNodeData">
                <el-descriptions :column="1" border>
                    <el-descriptions-item label="Name">{{ selectedNodeData.name }}</el-descriptions-item>
                    <el-descriptions-item v-if="selectedNodeData.type" label="Type">{{ selectedNodeData.type }}</el-descriptions-item>
                    <el-descriptions-item v-if="selectedNodeData.content" label="Content">
                        <pre class="content-pre">{{ selectedNodeData.content }}</pre>
                    </el-descriptions-item>
                    <el-descriptions-item v-if="selectedNodeData.duration" label="Duration">{{ selectedNodeData.duration }}</el-descriptions-item>
                    <el-descriptions-item v-if="selectedNodeData.tokens" label="Tokens">{{ selectedNodeData.tokens }}</el-descriptions-item>
                    <el-descriptions-item v-if="selectedNodeData.cacheHitRate" label="Cache Hit Rate">{{ selectedNodeData.cacheHitRate }}</el-descriptions-item>
                    <el-descriptions-item label="Status" v-if="selectedNodeData.status">
                        <el-tag :type="getNodeStatusType(selectedNodeData.status)">
                            {{ selectedNodeData.status }}
                        </el-tag>
                    </el-descriptions-item>
                </el-descriptions>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="nodeDetailVisible = false">Close</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, reactive, watch } from 'vue';
import * as d3 from 'd3';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { IRenderMessage } from '../chat-box/chat';
import { useI18n } from 'vue-i18n';

// 全局常量定义
const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const NODE_RADIUS = 16;
const LEFT_TEXT_OFFSET = 60;
const STATUS_CIRCLE_RADIUS = 6;
const STATUS_CIRCLE_X = NODE_WIDTH / 2 - LEFT_TEXT_OFFSET - 16;
const STATUS_CIRCLE_Y = NODE_HEIGHT - 16;
const STATUS_TEXT_X = NODE_WIDTH / 2 - LEFT_TEXT_OFFSET;
const STATUS_TEXT_Y = NODE_HEIGHT - 12;
const LABEL_Y = 20;
const DURATION_X = NODE_WIDTH - 10; // 耗时显示在右侧
const DURATION_Y = NODE_HEIGHT - 12; // 耗时与状态在同一行（底部）

const { t } = useI18n();

const props = defineProps<{
    renderMessages: IRenderMessage[];
}>();

const svgContainer = ref<HTMLDivElement | null>(null);
let prevNodes: any[] = [];
let prevEdges: any[] = [];

// 节点数据映射
const nodeDataMap = new Map<string, any>();

const state = reactive({
    nodes: [] as any[],
    edges: [] as any[],
});

// 节点详情弹窗相关
const nodeDetailVisible = ref(false);
const selectedNodeData = ref<any>(null);

const handleDialogClose = () => {
    nodeDetailVisible.value = false;
    selectedNodeData.value = null;
};

// 根据状态获取标签类型
function getNodeStatusType(status: string | undefined) {
    switch (status) {
        case 'success':
            return 'success';
        case 'error':
        case 'failed':
            return 'danger';
        case 'running':
            return 'warning';
        default:
            return 'info';
    }
}

// 处理消息数据，生成节点和边
function processMessages() {
    const nodes: any[] = [];
    const edges: any[] = [];
    nodeDataMap.clear();
    
    let nodeIndex = 0;

    // 为每个消息创建节点
    props.renderMessages.forEach((message, messageIndex) => {
        const prevNodeIndex = nodeIndex - 1;
        
        if (message.role === 'user') {
            const nodeId = `node-${nodeIndex}`;
            nodes.push({
                id: nodeId,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                labels: [{ text: 'User Message' }]
            });

            // 保存节点详细信息
            nodeDataMap.set(nodeId, {
                id: nodeId,
                name: 'User Message',
                type: 'User Input',
                content: message.content,
            });
            
            // 创建与前一个节点的边
            if (prevNodeIndex >= 0) {
                edges.push({
                    id: `edge-${prevNodeIndex}-${nodeIndex}`,
                    sources: [`node-${prevNodeIndex}`],
                    targets: [nodeId]
                });
            }
            
            nodeIndex++;
        } else if (message.role === 'assistant/content') {
            const nodeId = `node-${nodeIndex}`;
            // 计算耗时（当前节点与上一个节点的时间差）
            let duration = '';
            if (messageIndex > 0 && props.renderMessages[messageIndex - 1].extraInfo?.created && message.extraInfo?.created) {
                const prevMessage = props.renderMessages[messageIndex - 1];
                duration = (message.extraInfo.created - prevMessage.extraInfo.created) + ' ms';
            }
            
            // Token信息
            let tokens = '';
            let cacheHitRate = '';
            const usage = message.extraInfo.usage;
            if (usage) {
                tokens = `Input: ${usage.prompt_tokens || 0}, Output: ${usage.completion_tokens || 0}, Total: ${usage.total_tokens || 0}`;
                const cacheHitTokens = usage.prompt_tokens_details?.cached_tokens || 0;
                const inputTokens = usage.prompt_tokens || 0;
                if (inputTokens > 0) {
                    cacheHitRate = Math.round((cacheHitTokens / inputTokens) * 100) + '%';
                }
            }
            
            nodes.push({
                id: nodeId,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                labels: [{ text: 'Assistant Message' }],
                duration // 添加耗时信息
            });

            // 保存节点详细信息
            nodeDataMap.set(nodeId, {
                id: nodeId,
                name: 'Assistant Message',
                type: 'Assistant Output',
                content: message.content,
                duration,
                tokens,
                cacheHitRate,
                status: message.extraInfo.state === 'success' ? 'success' : message.extraInfo.state || 'default'
            });
            
            // 创建与前一个节点的边
            if (prevNodeIndex >= 0) {
                edges.push({
                    id: `edge-${prevNodeIndex}-${nodeIndex}`,
                    sources: [`node-${prevNodeIndex}`],
                    targets: [nodeId]
                });
            }
            
            nodeIndex++;
        } else if (message.role === 'assistant/tool_calls' && 'tool_calls' in message) {
            const toolCalls = message.tool_calls || [];
            
            // 为每个工具调用创建一个节点
            const toolNodeIndices: number[] = [];
            toolCalls.forEach((toolCall: any, toolIndex: number) => {
                const nodeId = `node-${nodeIndex}`;
                toolNodeIndices.push(nodeIndex);
                
                // 计算耗时（仅在第一个工具节点上显示）
                let duration = '';
                if (toolIndex === 0 && messageIndex > 0 && props.renderMessages[messageIndex - 1].extraInfo?.created && message.extraInfo?.created) {
                    const prevMessage = props.renderMessages[messageIndex - 1];
                    duration = (message.extraInfo.created - prevMessage.extraInfo.created) + ' ms';
                }
                
                // Token信息（仅在第一个工具节点上显示）
                let tokens = '';
                let cacheHitRate = '';
                if (toolIndex === 0) {
                    const usage = message.extraInfo.usage;
                    if (usage) {
                        tokens = `Input: ${usage.prompt_tokens || 0}, Output: ${usage.completion_tokens || 0}, Total: ${usage.total_tokens || 0}`;
                        const cacheHitTokens = usage.prompt_tokens_details?.cached_tokens || 0;
                        const inputTokens = usage.prompt_tokens || 0;
                        if (inputTokens > 0) {
                            cacheHitRate = Math.round((cacheHitTokens / inputTokens) * 100) + '%';
                        }
                    }
                }
                
                nodes.push({
                    id: nodeId,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT,
                    labels: [{ text: toolCall.function?.name || 'Tool Call' }],
                    duration: toolIndex === 0 ? duration : '' // 只在第一个工具节点上添加耗时
                });

                // 保存节点详细信息
                nodeDataMap.set(nodeId, {
                    id: nodeId,
                    name: toolCall.function?.name || 'Tool Call',
                    type: 'Tool Call',
                    content: toolCall.function?.arguments,
                    duration: toolIndex === 0 ? duration : '',
                    tokens: toolIndex === 0 ? tokens : '',
                    cacheHitRate: toolIndex === 0 ? cacheHitRate : '',
                    status: message.extraInfo.state === 'success' ? 'success' : message.extraInfo.state || 'default'
                });
                
                nodeIndex++;
            });
            
            // 创建工具调用之间的连接边
            for (let i = 0; i < toolNodeIndices.length - 1; i++) {
                edges.push({
                    id: `edge-${toolNodeIndices[i]}-${toolNodeIndices[i + 1]}`,
                    sources: [`node-${toolNodeIndices[i]}`],
                    targets: [`node-${toolNodeIndices[i + 1]}`]
                });
            }
            
            // 创建与前一个节点的边（连接到第一个工具节点）
            if (prevNodeIndex >= 0 && toolNodeIndices.length > 0) {
                edges.push({
                    id: `edge-${prevNodeIndex}-${toolNodeIndices[0]}`,
                    sources: [`node-${prevNodeIndex}`],
                    targets: [`node-${toolNodeIndices[0]}`]
                });
            }
            
            // 创建与后一个节点的边（从最后一个工具节点连接）
            if (toolNodeIndices.length > 0) {
                // 下一个消息的节点索引是当前的 nodeIndex
                // 我们稍后会处理这个连接
            }
        }
    });

    state.nodes = nodes;
    state.edges = edges;
}

const recomputeLayout = async () => {
    const elk = new ELK();
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.direction': 'DOWN',
            'elk.spacing.nodeNode': '40',
            'elk.layered.spacing.nodeNodeBetweenLayers': '40'
        },
        children: state.nodes,
        edges: state.edges
    };
    const layout = await elk.layout(elkGraph) as unknown as any;

    state.nodes.forEach((n, i) => {
        const ln = layout.children?.find((c: any) => c.id === n.id);
        if (ln) {
            n.x = ln.x;
            n.y = ln.y;
            n.width = ln.width || NODE_WIDTH;
            n.height = ln.height || NODE_HEIGHT;
        }
    });
    state.edges = layout.edges || [];

    return layout;
};

function renderSvg() {
    const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]));
    const prevEdgeMap = new Map(prevEdges.map(e => [e.id, e]));

    // 计算所有节点的最小x和最大x
    const xs = state.nodes.map(n => (n.x || 0));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs.map((x, i) => x + (state.nodes[i].width || NODE_WIDTH)));
    const contentWidth = maxX - minX;
    const svgWidth = Math.max(contentWidth + 120, 600); // 最小宽度600px
    const offsetX = (svgWidth - contentWidth) / 2 - minX;

    const height = Math.max(...state.nodes.map(n => (n.y || 0) + (n.height || NODE_HEIGHT)), 400) + 60;

    // 不再全量清空，只清空 svg 元素
    let svg = d3.select(svgContainer.value).select('svg');
    if (svg.empty()) {
        svg = d3
            .select(svgContainer.value)
            .append('svg')
            .attr('width', '100%')
            .attr('height', height)
            .attr('viewBox', `0 0 ${svgWidth} ${height}`)
            .style('user-select', 'none') as any;
    } else {
        svg.attr('width', '100%')
           .attr('height', height)
           .attr('viewBox', `0 0 ${svgWidth} ${height}`);
        svg.selectAll('defs').remove();
    }

    // Arrow marker
    svg
        .append('defs')
        .append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 0 8 8')
        .attr('refX', 6)
        .attr('refY', 4)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 8 4 L 0 8 z')
        .attr('fill', 'var(--main-color)');

    // 1. 创建/获取 main group
    let mainGroup = svg.select('g.main-group');
    if (mainGroup.empty()) {
        mainGroup = svg.append('g').attr('class', 'main-group') as any;
    }
    mainGroup
        .attr('transform', `translate(${offsetX}, 0)`);

    // Draw edges
    const allSections: { id: string, section: any }[] = [];
    (state.edges || []).forEach(edge => {
        const sections = edge.sections || [];
        sections.forEach((section: any, idx: number) => {
            allSections.push({
                id: (edge.id || '') + '-' + (section.id || idx),
                section
            });
        });
    });

    const edgeSelection = mainGroup.selectAll<SVGLineElement, any>('.edge')
        .data(allSections, d => d.id);

    edgeSelection.exit().remove();

    const edgeEnter = edgeSelection.enter()
        .append('line')
        .attr('class', 'edge')
        .attr('x1', d => {
            const prev = prevEdgeMap.get(d.id);
            return prev && prev.sections && prev.sections[0]
                ? prev.sections[0].startPoint.x
                : d.section.startPoint.x;
        })
        .attr('y1', d => {
            const prev = prevEdgeMap.get(d.id);
            return prev && prev.sections && prev.sections[0]
                ? prev.sections[0].startPoint.y
                : d.section.startPoint.y;
        })
        .attr('x2', d => {
            const prev = prevEdgeMap.get(d.id);
            return prev && prev.sections && prev.sections[0]
                ? prev.sections[0].endPoint.x
                : d.section.endPoint.x;
        })
        .attr('y2', d => {
            const prev = prevEdgeMap.get(d.id);
            return prev && prev.sections && prev.sections[0]
                ? prev.sections[0].endPoint.y
                : d.section.endPoint.y;
        })
        .attr('stroke', 'var(--main-color)')
        .attr('stroke-width', 2.5)
        .attr('marker-end', 'url(#arrow)');

    edgeEnter
        .transition()
        .duration(600)
        .attr('x1', d => d.section.startPoint.x)
        .attr('y1', d => d.section.startPoint.y)
        .attr('x2', d => d.section.endPoint.x)
        .attr('y2', d => d.section.endPoint.y);

    // update
    edgeSelection.merge(edgeEnter)
        .transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .attr('x1', d => d.section.startPoint.x)
        .attr('y1', d => d.section.startPoint.y)
        .attr('x2', d => d.section.endPoint.x)
        .attr('y2', d => d.section.endPoint.y);

    // --- 节点 ---
    const nodeGroup = mainGroup.selectAll<SVGGElement, any>('.node')
        .data(state.nodes, d => d.id);

    nodeGroup.exit().remove();

    // 节点 enter
    const nodeGroupEnter = nodeGroup.enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => {
            const prev = prevNodeMap.get(d.id);
            if (prev) {
                return `translate(${prev.x || 0}, ${prev.y || 0})`;
            }
            return `translate(${d.x || 0}, ${d.y || 0})`;
        })
        .style('cursor', 'pointer')
        .on('click', function (event, d) {
            // 显示节点详情弹窗
            const nodeData = nodeDataMap.get(d.id);
            if (nodeData) {
                selectedNodeData.value = nodeData;
                nodeDetailVisible.value = true;
            }
        });

    nodeGroupEnter.append('rect')
        .attr('width', (d: any) => d.width)
        .attr('height', (d: any) => d.height)
        .attr('rx', NODE_RADIUS)
        .attr('fill', 'var(--main-light-color-20)')
        .attr('stroke', 'var(--main-light-color-10)')
        .attr('stroke-width', 1);

    // 节点文字
    nodeGroupEnter.append('text')
        .attr('x', d => d.width / 2)
        .attr('y', LABEL_Y)
        .attr('text-anchor', 'middle')
        .attr('font-size', 14)
        .attr('fill', 'var(--main-color)')
        .attr('font-weight', 600)
        .text(d => d.labels?.[0]?.text || 'Node');

    nodeGroupEnter.append('g').attr('class', 'node-status');

    // 耗时显示（User Message 不显示）
    nodeGroupEnter.append('text')
        .attr('class', 'node-duration')
        .attr('x', DURATION_X)
        .attr('y', DURATION_Y)
        .attr('text-anchor', 'end')
        .attr('font-size', 12)
        .attr('fill', '#666')
        .text(d => {
            // User Message 不显示耗时
            if (d.labels?.[0]?.text === 'User Message') {
                return '';
            }
            const nodeData = nodeDataMap.get(d.id);
            return nodeData?.duration || '';
        });

    // 合并 enter+update
    const nodeStatusGroup = nodeGroup.merge(nodeGroupEnter).select('.node-status');

    // 先清空再重绘
    nodeStatusGroup.each(function (d) {
        const g = d3.select(this);
        g.selectAll('*').remove(); // 清空旧内容

        const nodeData = nodeDataMap.get(d.id);
        const status = nodeData?.status || 'default';
        if (status === 'running') {
            g.append('circle')
                .attr('cx', STATUS_CIRCLE_X)
                .attr('cy', STATUS_CIRCLE_Y)
                .attr('r', STATUS_CIRCLE_RADIUS)
                .attr('fill', 'none')
                .attr('stroke', 'var(--main-color)')
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', 20)
                .attr('stroke-dashoffset', 0)
                .append('animateTransform')
                .attr('attributeName', 'transform')
                .attr('attributeType', 'XML')
                .attr('type', 'rotate')
                .attr('from', `0 ${STATUS_CIRCLE_X} ${STATUS_CIRCLE_Y}`)
                .attr('to', `360 ${STATUS_CIRCLE_X} ${STATUS_CIRCLE_Y}`)
                .attr('dur', '1s')
                .attr('repeatCount', 'indefinite');
            g.append('text')
                .attr('x', STATUS_TEXT_X)
                .attr('y', STATUS_TEXT_Y)
                .attr('font-size', 13)
                .attr('fill', 'var(--main-color)')
                .text('running');
        } else if (status === 'default' || status === 'waiting') {

            const renderContent = nodeData.content.length > 12 ? nodeData.content.substring(0, 12) + '...' : nodeData.content;
            
            g.append('text')
                .attr('x', STATUS_TEXT_X - STATUS_CIRCLE_RADIUS - STATUS_CIRCLE_RADIUS)
                .attr('y', STATUS_TEXT_Y)
                .attr('font-size', 13)
                .attr('fill', '#bdbdbd')
                .text(renderContent);
        } else if (status === 'success') {
            g.append('circle')
                .attr('cx', STATUS_CIRCLE_X)
                .attr('cy', STATUS_CIRCLE_Y)
                .attr('r', STATUS_CIRCLE_RADIUS)
                .attr('fill', 'none')
                .attr('stroke', '#4caf50')
                .attr('stroke-width', 3);
            g.append('text')
                .attr('x', STATUS_TEXT_X)
                .attr('y', STATUS_TEXT_Y)
                .attr('font-size', 13)
                .attr('fill', '#4caf50')
                .text('success');
        } else if (status === 'error' || status === 'failed') {
            g.append('circle')
                .attr('cx', STATUS_CIRCLE_X)
                .attr('cy', STATUS_CIRCLE_Y)
                .attr('r', STATUS_CIRCLE_RADIUS)
                .attr('fill', 'none')
                .attr('stroke', '#f44336')
                .attr('stroke-width', 3);
            g.append('text')
                .attr('x', STATUS_TEXT_X)
                .attr('y', STATUS_TEXT_Y)
                .attr('font-size', 13)
                .attr('fill', '#f44336')
                .text('error');
        }
    });

    // 节点 enter 动画
    nodeGroupEnter
        .transition()
        .duration(600)
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

    // 节点 update 动画
    nodeGroup
        .transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

    // 更新耗时文本
    nodeGroup.select('.node-duration')
        .text(d => {
            // User Message 不显示耗时
            if (d.labels?.[0]?.text === 'User Message') {
                return '';
            }
            const nodeData = nodeDataMap.get(d.id);
            return nodeData?.duration || '';
        });

    // 渲染结束后保存当前快照
    prevNodes = state.nodes.map(n => ({ ...n }));
    prevEdges = (state.edges || []).map(e => ({ ...e, sections: e.sections ? e.sections.map((s: any) => ({ ...s })) : [] }));
}

// 绘制流程图
async function drawDiagram() {
    // 处理消息数据
    processMessages();
    
    // 重新计算布局
    await recomputeLayout();

    // 绘制 svg
    renderSvg();
}

// 监听 renderMessages 变化
watch(() => props.renderMessages, () => {
    nextTick(drawDiagram);
}, { deep: true });

onMounted(() => {
    nextTick(drawDiagram);
});
</script>

<style scoped>
.trace-diagram-container {
    position: relative;
    width: 100%;
    height: 100%;
}

.diagram-container {
    width: 100%;
    height: 100%;
    min-height: 400px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    border-radius: 8px;
    padding: 24px 0;
    overflow: auto;
}

.content-pre {
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    padding: 8px;
    background-color: var(--el-fill-color-light);
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
}

.dialog-footer {
    text-align: right;
}
</style>