<template>
	<el-tooltip content="访问 OpenMCP 官网" placement="right" effect="light">
		<div class="mcp-title" @click="clickLogo">
			<span class="iconfont icon-openmcp"></span>
		</div>
	</el-tooltip>
</template>

<script setup lang="ts">
import { defineComponent } from 'vue';

defineComponent({ name: 'mcp-title' });


function clickLogo() {
	window.open('https://openmcp.kirigaya.cn/', '_blank');
}

</script>

<style>
.mcp-title {
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-bottom: 1px solid var(--sidebar-border);
	user-select: none;
	-webkit-user-drag: none;
	transition: var(--animation-3s);
	cursor: pointer;
    margin-bottom: 100px;
	color: var(--foreground);
}

.mcp-title:hover {
	color: var(--main-color);
}

.mcp-title .iconfont {
    margin-top: 10px;
	font-size: 50px;
}

</style>