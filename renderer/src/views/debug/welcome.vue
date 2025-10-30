<template>
	<div class="debug-welcome">
		<span>{{ t('choose-a-project-debug') }}</span>
		
        <br>

		<!-- MCP Base 模块 -->
		<div class="welcome-container base-module"
			:ref="el => welcomeRef = el"
		>
			<span
				class="debug-option"
				:class="{ 'disable': !mcpClientAdapter.connected }"
				v-for="(option, index) of baseOptions"
				:key="index"
				@click="chooseDebugMode(index)"
			>
				<span>
					<span :class="`iconfont ${option.icon}`"></span>
				</span>
				<span>{{ option.name }}</span>
			</span>
		</div>
        <br>
		
		<!-- MCP Advance 模块 -->
		<div class="welcome-container advance-module"
			:ref="el => welcomeRef = el"
		>
			<span
				class="debug-option"
				:class="{ 'disable': !mcpClientAdapter.connected }"
				v-for="(option, index) of advanceOptions"
				:key="index"
				@click="chooseDebugMode(index + 3)"
			>
				<span>
					<span :class="`iconfont ${option.icon}`"></span>
				</span>
				<span>{{ option.name }}</span>
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { tabs } from '@/components/main-panel/panel';
import { defineComponent, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { welcomeRef } from './welcome';
import { mcpClientAdapter } from '../connect/core';

defineComponent({ name: 'welcome' });

const { t } = useI18n();

// MCP Base 模块 - resources, prompts, tools
const baseOptions = [
	{
		icon: 'icon-file',
		name: computed(() => t("resources")),
		ident: 'resources'
	},
	{
		icon: 'icon-chat',
		name: computed(() => t("prompts")),
		ident: 'prompts'
	},
	{
		icon: 'icon-tool',
		name: computed(() => t("tools")),
		ident: 'tool'
	}
];

// MCP Advance 模块 - interaction-test, lookup-reflux-data
const advanceOptions = [
	{
		icon: 'icon-robot',
		name: computed(() => t("interaction-test")),
		ident: 'interaction'
	},
	{
		icon: 'icon-database',
		name: computed(() => t('lookup-reflux-data')),
		ident: 'reflux'
	}
];

function chooseDebugMode(index: number) {
	// TODO: 支持更多的 server
	if (mcpClientAdapter.connected) {
		const activeTab = tabs.activeTab;
		activeTab.componentIndex = index;
		// 根据索引确定使用哪个选项数组中的图标
		if (index < 3) {
			activeTab.icon = baseOptions[index].icon;
			activeTab.name = baseOptions[index].name as any;
		} else {
			activeTab.icon = advanceOptions[index - 3].icon;
			activeTab.name = advanceOptions[index - 3].name as any;
		}

		// 此处可以这么做是因为这个操作过后 activeTab 绑定的 tab 的 name 就不会再被进行赋值操作了
		// console.log(debugOptions[index]);

		console.log(tabs);
	} else {
		const message = t('warning.click-to-connect')
			.replace('$1', t('connect'));
		
		ElMessage({
			message,
			type: 'error',
			duration: 3000,
			showClose: true,
		});
	}
}

</script>

<style>
.debug-welcome {
	display: flex;
	flex-direction: column;
	align-items: center; /* 左对齐 */
	justify-content: center;
	width: 100%;
	padding: 0 50px; /* 添加内边距 */
	box-sizing: border-box;
}

.debug-welcome > span {
	font-size: 30px;
	margin: 30px 0; /* 调整上下边距 */
}

.module-title {
	font-size: 24px;
	font-weight: bold;
	margin: 30px 0 20px 0; /* 调整标题边距 */
	width: 100%;
	text-align: left; /* 标题左对齐 */
}

.welcome-container {
	display: flex;
	flex-wrap: wrap;
	gap: 30px; /* 减小间距 */
	width: 100%;
	justify-content: flex-start; /* 左对齐 */
}

.base-module {
	/* MCP Base 模块容器 */
}

.advance-module {
	/* MCP Advance 模块容器 */
}

.base-module > span {
	flex: 1 1 calc(33.333% - 30px); /* 三个一行，调整宽度计算 */
	max-width: calc(33.333% - 30px);
	min-width: 200px; /* 设置最小宽度 */
}

.advance-module > span {
	flex: 1 1 calc(50% - 30px); /* 两个一行，调整宽度计算 */
	max-width: calc(50% - 30px);
	min-width: 250px; /* 设置最小宽度 */
}

.welcome-container > span {
	box-sizing: border-box;
	transition: .3s transform ease-in-out;
}

.debug-option {
	display: flex;
	flex-direction: column;
	align-items: center;
	font-size: 20px; /* 稍微减小字体 */
	padding: 25px 0; 
	border-radius: .5em;
	cursor: pointer;
	border: 1px solid var(--sidebar);
	transition: var(--animation-3s);
	height: 100%;
	min-height: 160px; /* 稍微减小最小高度 */
	justify-content: center;
	text-align: center;
}

.debug-option > span:first-child {
	margin-bottom: 12px;
}

.debug-option:hover {
	border: 1px solid var(--main-color);
	transition: var(--animation-3s);
	transform: translateY(-5px); /* 添加轻微的上移效果 */
}

.debug-option .iconfont {
	font-size: 42px; /* 稍微减小图标大小 */
}

.debug-welcome {
	user-select: none;
	min-height: 80%;
}

.debug-option.disable {
	cursor: not-allowed;
	opacity: 0.5;
}

/* 响应式设计 */
@media (max-width: 1200px) {
	.base-module > span {
		flex: 1 1 calc(50% - 20px); /* 屏幕较小时每行显示两个 */
		max-width: calc(50% - 20px);
	}
	
	.advance-module > span {
		flex: 1 1 calc(50% - 20px); /* 屏幕较小时每行显示两个 */
		max-width: calc(50% - 20px);
	}
	
	.debug-option {
		font-size: 18px;
		min-height: 150px;
	}
}

@media (max-width: 768px) {
	.debug-welcome {
		padding: 0 20px; /* 移动端减小内边距 */
	}
	
	.base-module > span,
	.advance-module > span {
		flex: 1 1 100%; /* 移动端每行显示一个 */
		max-width: 100%;
	}
	
	.welcome-container {
		gap: 20px;
	}
	
	.debug-option {
		font-size: 18px;
		min-height: 140px;
	}
	
	.debug-option .iconfont {
		font-size: 36px;
	}
	
	.module-title {
		font-size: 20px;
	}
}
</style>