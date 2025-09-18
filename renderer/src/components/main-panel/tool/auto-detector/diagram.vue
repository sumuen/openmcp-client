<script setup lang="ts">
import { ref, onMounted, nextTick, reactive, inject, computed } from 'vue';
import * as d3 from 'd3';
import ELK from 'elkjs/lib/elk.bundled.js';
import { mcpClientAdapter } from '@/views/connect/core';
import { invalidConnectionDetector, type Edge, type Node, type NodeDataView } from './diagram';
import { ElMessage } from 'element-plus';


import DiagramItemRecord from './diagram-item-record.vue';
import { useI18n } from 'vue-i18n';
import type { ToolStorage } from '../tools';
import { tabs } from '../../panel';

const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const svgContainer = ref<HTMLDivElement | null>(null);
let prevNodes: any[] = [];
let prevEdges: any[] = [];

// 缩放相关变量
const scale = ref(1);
const minScale = 0.5;
const maxScale = 2;
const scaleStep = 0.1;

const state = reactive({
    nodes: [] as Node[],
    edges: [] as Edge[],
    selectedNodeId: null as string | null,
    draggingNodeId: null as string | null,
    hoverNodeId: null as string | null,
    pinnedNodeId: null as string | null, // 新增
    offset: { x: 0, y: 0 },
    dataView: new Map<string, NodeDataView>
});

// 状态机可视化相关
const stateMachineState = reactive({
    messages: [] as any[], // 存储渲染消息
    nodeMap: new Map<string, any>(), // 节点映射
    edgeSet: new Set<string>() // 边集合，避免重复连接
});

const tab = tabs.content[props.tabId];
const tabStorage = tab.storage as ToolStorage;
const autoDetectDiagram = tabStorage.autoDetectDiagram;

if (autoDetectDiagram) {
    // 将 tabStorage.autoDetectDiagram 中的 dataView 保存到 state 中
    autoDetectDiagram.views?.forEach(item => {
        state.dataView.set(item.tool.name, {
            tool: item.tool,
            function: item.function, 
            status: item.status || 'waiting',
            result: item.result || null,
            createAt: item.createAt,
            finishAt: item.finishAt,
            llmTimecost: item.llmTimecost,
            toolcallTimecost: item.toolcallTimecost
        });
    });
} else {
    tabStorage.autoDetectDiagram = {
        edges: [],
        views: []
    };
}


let cancelHoverHandler: NodeJS.Timeout | undefined = undefined;

const setHoverItem = (id: string) => {
    if (state.pinnedNodeId) return; // 如果已pin，不响应hover
    if (cancelHoverHandler) {
        clearTimeout(cancelHoverHandler);
    }
    state.hoverNodeId = id;
};

const clearHoverItem = () => {
    if (state.pinnedNodeId) return; // 如果已pin，不响应hover
    cancelHoverHandler = setTimeout(() => {
        if (cancelHoverHandler) {
            clearTimeout(cancelHoverHandler);
        }
        if (state.hoverNodeId) {
            state.hoverNodeId = null;
        }
    }, 300);
};

// pin 按钮点击事件
function togglePin() {
    if (state.pinnedNodeId) {
        state.pinnedNodeId = null;
    } else if (state.hoverNodeId) {
        state.pinnedNodeId = state.hoverNodeId;
    }
}

// 让面板内容始终显示 pinnedNodeId 优先
const infoNodeId = computed(() => state.pinnedNodeId || state.hoverNodeId);


const getAllTools = async () => {
    const items = [];
    for (const client of mcpClientAdapter.clients) {
        const clientTools = await client.getTools();
        items.push(...clientTools.values());
    }
    return items;
};

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
    const layout = await elk.layout(elkGraph) as unknown as Node;

    state.nodes.forEach((n, i) => {
        const ln = layout.children?.find(c => c.id === n.id);
        if (ln) {
            n.x = ln.x;
            n.y = ln.y;
            n.width = ln.width || 200; // 默认宽度
            n.height = ln.height || 64; // 默认高度
        }
    });
    state.edges = layout.edges || [];

    // 保存拓扑信息到 tabStorage
    tabStorage.autoDetectDiagram!.edges = state.edges.map(edge => ({
        id: edge.id,
        sources: edge.sources || [],
        targets: edge.targets || []
    }));

    return layout;
};

const drawDiagram = async () => {
    const tools = await getAllTools();

    // 默认按照链表进行串联
    const nodes = [] as Node[];
    const edges = [] as Edge[];

    // 如果保存了 edges 信息，则需要进行同步
    const reservedEdges = autoDetectDiagram?.edges;
    if (reservedEdges) {
        for (const edge of reservedEdges) {
            if (edge.sources && edge.targets && edge.sources.length > 0 && edge.targets.length > 0) {
                edges.push({
                    id: edge.id,
                    sources: edge.sources || [],
                    targets: edge.targets || [],
                });
            }
        }
    } else {
        for (let i = 0; i < tools.length - 1; ++i) {
            const prev = tools[i];
            const next = tools[i + 1];
            edges.push({
                id: prev.name + '-' + next.name,
                sources: [prev.name],
                targets: [next.name]
            })
        }
    }

    for (const tool of tools) {
        nodes.push({
            id: tool.name,
            width: 200,
            height: 64, // 增加高度
            labels: [{ text: tool.name || 'Tool' }]
        });

        if (!state.dataView.has(tool.name)) {
            // 如果 dataView 中没有该工具，则初始化
            state.dataView.set(tool.name, {
                tool,
                status: 'waiting',
            });
        }
    }

    state.edges = edges;
    state.nodes = nodes;

    // 重新计算布局
    await recomputeLayout();

    // 绘制 svg
    renderSvg();
};

// 添加状态机可视化功能
const createStateMachineVisualization = async (messages: any[]) => {
    // 清空现有状态
    state.nodes = [];
    state.edges = [];
    stateMachineState.messages = messages;
    stateMachineState.nodeMap.clear();
    stateMachineState.edgeSet.clear();
    
    // 获取所有工具
    const tools = await getAllTools();
    
    // 创建工具名称到工具对象的映射
    const toolMap = new Map<string, any>();
    tools.forEach(tool => {
        toolMap.set(tool.name, tool);
    });
    
    // 1. 先创建所有节点
    const nodeIds = new Set<string>();
    
    // 处理消息，创建节点
    for (const message of messages) {
        if (message.role === 'user') {
            // 用户输入节点
            const nodeId = `user-${message.id}`;
            if (!nodeIds.has(nodeId)) {
                state.nodes.push({
                    id: nodeId,
                    width: 200,
                    height: 80,
                    labels: [{ text: t('user-input') }],
                    type: 'user-input',
                    content: message.content
                });
                nodeIds.add(nodeId);
                stateMachineState.nodeMap.set(nodeId, {
                    id: nodeId,
                    name: t('user-input'),
                    type: 'user-input',
                    content: message.content,
                    status: 'success'
                });
            }
        } else if (message.role === 'assistant') {
            // 助手消息节点
            const nodeId = `assistant-${message.id}`;
            if (!nodeIds.has(nodeId)) {
                state.nodes.push({
                    id: nodeId,
                    width: 200,
                    height: 80,
                    labels: [{ text: t('assistant-output') }],
                    type: 'assistant-output',
                    content: message.content
                });
                nodeIds.add(nodeId);
                stateMachineState.nodeMap.set(nodeId, {
                    id: nodeId,
                    name: t('assistant-output'),
                    type: 'assistant-output',
                    content: message.content,
                    status: message.status || 'success'
                });
            }
            
            // 处理工具调用
            if (message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    const toolName = toolCall.function?.name;
                    if (toolName) {
                        // 工具节点（根据名称规约）
                        if (!nodeIds.has(toolName)) {
                            state.nodes.push({
                                id: toolName,
                                width: 200,
                                height: 80,
                                labels: [{ text: toolName }],
                                type: 'tool-call'
                            });
                            nodeIds.add(toolName);
                            
                            // 查找工具信息
                            const tool = toolMap.get(toolName);
                            stateMachineState.nodeMap.set(toolName, {
                                id: toolName,
                                name: toolName,
                                type: 'tool-call',
                                content: tool ? tool.description : '',
                                status: 'waiting'
                            });
                        }
                    }
                }
            }
        } else if (message.role === 'tool') {
            // 工具结果节点
            const nodeId = `tool-result-${message.id}`;
            const toolName = message.name || 'Unknown Tool';
            if (!nodeIds.has(nodeId)) {
                state.nodes.push({
                    id: nodeId,
                    width: 200,
                    height: 80,
                    labels: [{ text: `${toolName} ${t('result')}` }],
                    type: 'tool-result'
                });
                nodeIds.add(nodeId);
                stateMachineState.nodeMap.set(nodeId, {
                    id: nodeId,
                    name: `${toolName} ${t('result')}`,
                    type: 'tool-result',
                    content: message.content,
                    status: 'success'
                });
            }
        }
    }
    
    // 2. 根据消息顺序创建连接
    for (let i = 0; i < messages.length - 1; i++) {
        const currentMessage = messages[i];
        const nextMessage = messages[i + 1];
        
        let sourceNodeId = '';
        let targetNodeId = '';
        
        // 确定当前节点ID
        if (currentMessage.role === 'user') {
            sourceNodeId = `user-${currentMessage.id}`;
        } else if (currentMessage.role === 'assistant') {
            sourceNodeId = `assistant-${currentMessage.id}`;
            
            // 如果当前消息有工具调用，连接到工具
            if (currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
                for (const toolCall of currentMessage.tool_calls) {
                    const toolName = toolCall.function?.name;
                    if (toolName) {
                        // 创建从助手到工具的连接
                        const edgeId = `${sourceNodeId}-${toolName}`;
                        if (!stateMachineState.edgeSet.has(edgeId)) {
                            state.edges.push({
                                id: edgeId,
                                sources: [sourceNodeId],
                                targets: [toolName]
                            });
                            stateMachineState.edgeSet.add(edgeId);
                        }
                        
                        // 如果下一个消息是工具调用的结果，创建从工具到下一个消息的连接
                        if (nextMessage.role === 'tool' && nextMessage.name === toolName) {
                            const targetNodeId = `tool-result-${nextMessage.id}`;
                            const toolEdgeId = `${toolName}-${targetNodeId}`;
                            if (!stateMachineState.edgeSet.has(toolEdgeId)) {
                                state.edges.push({
                                    id: toolEdgeId,
                                    sources: [toolName],
                                    targets: [targetNodeId]
                                });
                                stateMachineState.edgeSet.add(toolEdgeId);
                            }
                        }
                    }
                }
                continue; // 工具调用的消息不需要与其他消息直接连接
            }
        } else if (currentMessage.role === 'tool') {
            sourceNodeId = `tool-result-${currentMessage.id}`;
        }
        
        // 确定目标节点ID
        if (nextMessage.role === 'user') {
            targetNodeId = `user-${nextMessage.id}`;
        } else if (nextMessage.role === 'assistant') {
            targetNodeId = `assistant-${nextMessage.id}`;
        } else if (nextMessage.role === 'tool') {
            targetNodeId = `tool-result-${nextMessage.id}`;
        }
        
        // 创建连接（避免重复）
        if (sourceNodeId && targetNodeId) {
            const edgeId = `${sourceNodeId}-${targetNodeId}`;
            if (!stateMachineState.edgeSet.has(edgeId)) {
                state.edges.push({
                    id: edgeId,
                    sources: [sourceNodeId],
                    targets: [targetNodeId]
                });
                stateMachineState.edgeSet.add(edgeId);
            }
        }
    }
    
    // 特殊处理：工具调用到自身的连接
    for (const message of messages) {
        if (message.role === 'assistant' && message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                const toolName = toolCall.function?.name;
                if (toolName) {
                    // 检查是否有下一个工具调用是相同的工具
                    const edgeId = `${toolName}-${toolName}`;
                    if (!stateMachineState.edgeSet.has(edgeId)) {
                        // 这里我们不创建自连接，因为这在可视化上可能不清晰
                        // 如果需要自连接，可以在这里添加逻辑
                    }
                }
            }
        }
    }
    
    // 重新计算布局
    await recomputeLayout();
    
    // 绘制 SVG
    renderSvg();
};

function renderSvg() {
    const prevNodeMap = new Map(prevNodes.map(n => [n.id, n]));
    const prevEdgeMap = new Map(prevEdges.map(e => [e.id, e]));

    // 计算所有节点的最小x和最大x
    const xs = state.nodes.map(n => (n.x || 0));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs.map((x, i) => x + (state.nodes[i].width || 160)));
    const contentWidth = maxX - minX;
    const svgWidth = Math.max(contentWidth + 120, 400); // 120为两侧留白
    const offsetX = (svgWidth - contentWidth) / 2 - minX;

    const height = Math.max(...state.nodes.map(n => (n.y || 0) + (n.height || 48)), 300) + 60;

    // 不再全量清空，只清空 svg 元素
    let svg = d3.select(svgContainer.value).select('svg');
    if (svg.empty()) {
        svg = d3
            .select(svgContainer.value)
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', height)
            .style('user-select', 'none') as any;
    } else {
        svg.attr('width', svgWidth).attr('height', height);
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
    // 应用平移和缩放
    mainGroup
        .attr('transform', `translate(${offsetX}, 0) scale(${scale.value})`)
        .transition()
        .duration(600)
        .attr('transform', `translate(${offsetX}, 0) scale(${scale.value})`);

    // Draw edges with enter animation
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
                ? prev.sections[0].startPoint.x + 30
                : d.section.startPoint.x + 30;
        })
        .attr('y1', d => {
            const prev = prevEdgeMap.get(d.id);
            return prev && prev.sections && prev.sections[0]
                ? prev.sections[0].startPoint.y + 30
                : d.section.startPoint.y + 30;
        })
        .attr('x2', d => {
            const prev = prevEdgeMap.get(d.id);
            return prev && prev.sections && prev.sections[0]
                ? prev.sections[0].endPoint.x + 30
                : d.section.endPoint.x + 30;
        })
        .attr('y2', d => {
            const prev = prevEdgeMap.get(d.id);
            return prev && prev.sections && prev.sections[0]
                ? prev.sections[0].endPoint.y + 30
                : d.section.endPoint.y + 30;
        })
        .attr('stroke', 'var(--main-color)')
        .attr('stroke-width', 2.5)
        .attr('marker-end', 'url(#arrow)')
        .attr('opacity', 0);

    edgeEnter
        .transition()
        .duration(600)
        .attr('opacity', 1)
        .attr('x1', d => d.section.startPoint.x + 30)
        .attr('y1', d => d.section.startPoint.y + 30)
        .attr('x2', d => d.section.endPoint.x + 30)
        .attr('y2', d => d.section.endPoint.y + 30);

    // update + 动画（注意这里不再 transition opacity）
    edgeSelection.merge(edgeEnter)
        .transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .attr('x1', d => d.section.startPoint.x + 30)
        .attr('y1', d => d.section.startPoint.y + 30)
        .attr('x2', d => d.section.endPoint.x + 30)
        .attr('y2', d => d.section.endPoint.y + 30)
        .attr('opacity', 1);

    // --- 节点动画部分 ---
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
                return `translate(${(prev.x || 0) + 30}, ${(prev.y || 0) + 30})`;
            }
            return `translate(${(d.x || 0) + 30}, ${(d.y || 0) + 30})`;
        })
        .style('cursor', 'pointer')
        .attr('opacity', 0)
        .on('mousedown', null)
        .on('mouseup', function (event, d) {
            event.stopPropagation();
            if (state.selectedNodeId) {

                const { canConnect, reason } = invalidConnectionDetector(state, d);
                console.log(reason);

                if (reason) {
                    ElMessage.warning(reason);
                }

                if (canConnect) {
                    state.edges.push({
                        id: `e${state.selectedNodeId}_${d.id}_${Date.now()}`,
                        sources: [state.selectedNodeId],
                        targets: [d.id]
                    });
                    state.selectedNodeId = null;
                    recomputeLayout().then(renderSvg);
                } else {
                    // 已存在则只取消选中
                    state.selectedNodeId = null;
                    renderSvg();
                }
                context.setCaption('');

            } else {
                state.selectedNodeId = d.id;
                renderSvg();
                context.setCaption(t('select-node-define-test-tomo'));
            }
            state.draggingNodeId = null;
        })
        .on('mouseover', function (event, d) {
            setHoverItem(d.id);
            d3.select(this).select('rect')
                .transition()
                .duration(200)
                .attr('stroke', 'var(--main-color)')
                .attr('stroke-width', 2);
        })
        .on('mouseout', function (event, d) {
            // clearHoverItem();
            if (state.selectedNodeId === d.id) return;
            d3.select(this).select('rect')
                .transition()
                .duration(200)
                .attr('stroke', 'var(--main-light-color-10)')
                .attr('stroke-width', 1);
        });

    nodeGroupEnter.append('rect')
        .attr('width', (d: any) => d.width)
        .attr('height', (d: any) => d.height)
        .attr('rx', 16)
        .attr('fill', (d: any) => {
            // 根据节点类型设置不同的填充颜色
            if (d.type === 'user-input') return '#e3f2fd'; // 蓝色系 - 用户输入
            if (d.type === 'assistant-output') return '#f3e5f5'; // 紫色系 - 助手输出
            if (d.type === 'tool-call') return '#e8f5e8'; // 绿色系 - 工具调用
            if (d.type === 'tool-result') return '#fff3e0'; // 橙色系 - 工具结果
            return 'var(--main-light-color-20)'; // 默认颜色
        })
        .attr('stroke', d => state.selectedNodeId === d.id ? 'var(--main-color)' : 'var(--main-light-color-10)')
        .attr('stroke-width', 2);

    // 节点文字
    nodeGroupEnter.append('text')
        .attr('x', d => d.width / 2)
        .attr('y', d => d.height / 2 - 6) // 上移一点
        .attr('text-anchor', 'middle')
        .attr('font-size', 16)
        .attr('fill', 'var(--main-color)')
        .attr('font-weight', 600)
        .text(d => d.labels?.[0]?.text || 'Node');

    nodeGroupEnter.append('g').attr('class', 'node-status');

    // 合并 enter+update
    const nodeStatusGroup = nodeGroup.merge(nodeGroupEnter).select('.node-status');

    // 先清空再重绘
    nodeStatusGroup.each(function (d) {
        const g = d3.select(this);
        g.selectAll('*').remove(); // 清空旧内容

        // 获取节点状态（针对状态机可视化）
        const nodeData = stateMachineState.nodeMap.get(d.id);
        const status = nodeData?.status || state.dataView.get(d.id)?.status || 'waiting';
        
        if (status === 'running') {
            g.append('circle')
                .attr('cx', d.width / 2 - 32)
                .attr('cy', d.height - 16)
                .attr('r', 6)
                .attr('fill', 'none')
                .attr('stroke', 'var(--main-color)')
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', 20)
                .attr('stroke-dashoffset', 0)
                .append('animateTransform')
                .attr('attributeName', 'transform')
                .attr('attributeType', 'XML')
                .attr('type', 'rotate')
                .attr('from', `0 ${(d.width / 2 - 32)} ${(d.height - 16)}`)
                .attr('to', `360 ${(d.width / 2 - 32)} ${(d.height - 16)}`)
                .attr('dur', '1s')
                .attr('repeatCount', 'indefinite');
            g.append('text')
                .attr('x', d.width / 2 - 16)
                .attr('y', d.height - 12)
                .attr('font-size', 13)
                .attr('fill', 'var(--main-color)')
                .text('running');
        } else if (status === 'waiting') {
            g.append('circle')
                .attr('cx', d.width / 2 - 32)
                .attr('cy', d.height - 16)
                .attr('r', 6)
                .attr('fill', 'none')
                .attr('stroke', '#bdbdbd')
                .attr('stroke-width', 3);
            g.append('text')
                .attr('x', d.width / 2 - 16)
                .attr('y', d.height - 12)
                .attr('font-size', 13)
                .attr('fill', '#bdbdbd')
                .text('waiting');
        } else if (status === 'success') {
            g.append('circle')
                .attr('cx', d.width / 2 - 32)
                .attr('cy', d.height - 16)
                .attr('r', 6)
                .attr('fill', 'none')
                .attr('stroke', '#4caf50')
                .attr('stroke-width', 3);
            g.append('text')
                .attr('x', d.width / 2 - 16)
                .attr('y', d.height - 12)
                .attr('font-size', 13)
                .attr('fill', '#4caf50')
                .text('success');
        } else if (status === 'error') {
            g.append('circle')
                .attr('cx', d.width / 2 - 32)
                .attr('cy', d.height - 16)
                .attr('r', 6)
                .attr('fill', 'none')
                .attr('stroke', '#f44336')
                .attr('stroke-width', 3);
            g.append('text')
                .attr('x', d.width / 2 - 16)
                .attr('y', d.height - 12)
                .attr('font-size', 13)
                .attr('fill', '#f44336')
                .text('error');
        }
    });
    // 节点 enter 动画
    nodeGroupEnter
        .transition()
        .duration(600)
        .attr('opacity', 1)
        .attr('transform', d => `translate(${(d.x || 0) + 30}, ${(d.y || 0) + 30})`);

    // 节点 update 动画
    nodeGroup
        .transition()
        .duration(600)
        .ease(d3.easeCubicInOut)
        .attr('transform', d => `translate(${(d.x || 0) + 30}, ${(d.y || 0) + 30})`);

    // 高亮选中节点动画
    nodeGroup.select('rect')
        .transition()
        .duration(400)
        .attr('stroke', d => state.selectedNodeId === d.id ? 'var(--main-color)' : 'var(--main-light-color-10)');

    // 边高亮
    svg.selectAll<SVGLineElement, any>('.edge')
        .on('mouseover', function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke', 'var(--main-color)')
                .attr('stroke-width', 4.5);

            context.setCaption(t('click-edge-to-delete'));

        })
        .on('mouseout', function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke', 'var(--main-color)')
                .attr('stroke-width', 2.5);

            context.setCaption('');
        })
        .on('click', function (event, d) {
            // 只删除当前 edge
            state.edges = state.edges.filter(e => {
                // 多段 edge 情况
                if (e.sections) {
                    // 只保留不是当前 section 的
                    return !e.sections.some((section: any, idx: number) =>
                        ((e.id || '') + '-' + (section.id || idx)) === d.id
                    );
                }
                // 单段 edge 情况
                return e.id !== d.id && e.id !== d.section?.id;
            });
            recomputeLayout().then(renderSvg);
            event.stopPropagation();
        });

    // 渲染结束后保存当前快照
    prevNodes = state.nodes.map(n => ({ ...n }));
    prevEdges = (state.edges || []).map(e => ({ ...e, sections: e.sections ? e.sections.map((s: any) => ({ ...s })) : [] }));
}

// 重置连接为链表结构
function serialConnection() {
    if (!state.nodes.length) return;
    const edges = [];
    for (let i = 0; i < state.nodes.length - 1; ++i) {
        const prev = state.nodes[i];
        const next = state.nodes[i + 1];
        edges.push({
            id: prev.id + '-' + next.id,
            sources: [prev.id],
            targets: [next.id]
        });
    }
    state.edges = edges;
    recomputeLayout().then(renderSvg);
}

function parallelConnection() {
    if (!state.nodes.length) return;
    const edges = [] as Edge[];
    state.edges = edges;
    recomputeLayout().then(renderSvg);
}

const context = inject('context') as any;
context.preset = (type: string) => {
    if (type === 'serial') {
        serialConnection();
    } else if (type === 'parallel') {
        parallelConnection();
    }
};
context.state = state;
context.render = renderSvg;

// 暴露状态机可视化方法给外部使用
context.createStateMachineVisualization = createStateMachineVisualization;

onMounted(() => {
    nextTick(drawDiagram);
    
    // 添加触控板手势支持
    if (svgContainer.value) {
        let pinchStartScale = 1;
        let initialDistance = 0;
        
        // 监听触摸开始事件
        svgContainer.value.addEventListener('touchstart', (event: TouchEvent) => {
            if (event.touches.length === 2) {
                // 双指触摸，准备进行缩放
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                initialDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                pinchStartScale = scale.value;
                event.preventDefault();
            }
        });
        
        // 监听触摸移动事件
        svgContainer.value.addEventListener('touchmove', (event: TouchEvent) => {
            if (event.touches.length === 2 && initialDistance > 0) {
                // 双指移动，进行缩放
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                // 计算缩放比例
                const scaleChange = currentDistance / initialDistance;
                scale.value = Math.min(maxScale, Math.max(minScale, pinchStartScale * scaleChange));
                
                // 应用缩放
                applyZoom();
                event.preventDefault();
            }
        });
        
        // 监听触摸结束事件
        svgContainer.value.addEventListener('touchend', () => {
            initialDistance = 0;
        });
    }
});

// 4. 计算窗口位置
function getNodePopupStyle(node: any): any {
    // 节点的 svg 坐标转为容器内绝对定位
    // 注意：这里假设 offsetX、node.x、node.y 已经是最新的
    const marginX = 50;
    const marginY = 80;
    const popupWidth = 300;
    const popupHeight = 500;

    let left = (node.x || 0) + (node.width || 160) + 100;
    let top = (node.y || 0) + 30;

    // 获取容器宽高
    const container = svgContainer.value;
    let containerWidth = 1200, containerHeight = 800; // 默认值
    if (container) {
        const rect = container.getBoundingClientRect();
        containerWidth = rect.width;
        containerHeight = rect.height;
    }

    // 限制 left 和 top 不超出容器
    left = Math.max(marginX, Math.min(left, containerWidth - popupWidth - marginX));
    top = Math.max(marginY, Math.min(top, containerHeight - popupHeight - marginY));

    return {
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${popupWidth}px`,
        height: `${popupHeight}px`
    };
}

// 重置所有节点的状态为初始值
function resetDataView() {
    state.dataView.forEach((view, key) => {
        state.dataView.set(key, {
            ...view,
            status: 'waiting',
            result: null,
            createAt: undefined,
            finishAt: undefined,
            llmTimecost: undefined,
            toolcallTimecost: undefined
        });
    });
}

context.resetDataView = resetDataView;

// 处理滚轮事件实现缩放功能
const handleWheel = (event: WheelEvent) => {
    if (!svgContainer.value) return;
    
    // 只有在按住 Ctrl 键时才进行缩放
    if (event.ctrlKey) {
        event.preventDefault();
        
        // 根据滚动方向调整缩放比例
        if (event.deltaY < 0) {
            // 向上滚动，放大
            scale.value = Math.min(maxScale, scale.value + scaleStep);
        } else {
            // 向下滚动，缩小
            scale.value = Math.max(minScale, scale.value - scaleStep);
        }
        
        // 应用缩放
        applyZoom();
    }
};

// 应用缩放变换到 SVG
const applyZoom = () => {
    if (!svgContainer.value) return;
    
    const svg = d3.select(svgContainer.value).select('svg');
    if (!svg.empty()) {
        svg.select('.main-group')
            .attr('transform', `scale(${scale.value})`);
    }
};