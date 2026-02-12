<template>
	<el-scrollbar height="100%">
		<div class="setting-container">
			<div class="setting-tabs-wrapper">
				<el-segmented
                    v-model="settingSections.current"
                    :options="settingSections.data" size="default"
					class="setting-segmented"
                >
					<template #default="scope">
						<div class="setting-section-option">
							{{ scope.item.label }}
						</div>
					</template>
				</el-segmented>
			</div>
			<div class="setting-content">
				<General v-show="settingSections.current === 'general'"></General>
				<Api v-show="settingSections.current === 'api'"></Api>
				<Appearance v-show="settingSections.current === 'appearance'"></Appearance>
			</div>
		</div>
	</el-scrollbar>
</template>

<script setup lang="ts">
import { defineComponent, ref, onMounted } from 'vue';

import { colorManager } from './color';

import General from './general.vue';
import Api from './api.vue';
import Appearance from './appearance.vue';
import { settingSections } from './setting-section';

defineComponent({ name: 'setting' });

onMounted(() => {
	colorManager.initColor();
});



</script>

<style>
.setting-container {
	position: relative;
	width: 100%;
	max-width: 720px;
	padding: 24px 32px;
	height: fit-content;
	display: flex;
	flex-direction: column;
	gap: 24px;
	margin: 0 auto;
}

.setting-tabs-wrapper {
	background-color: var(--background);
	border-radius: 16px;
	padding: 6px;
	border: 1px solid var(--sidebar-border);
}

.setting-segmented {
	background-color: transparent !important;
	border: none !important;
}

.setting-segmented :deep(.el-segmented__group) {
	display: flex;
	gap: 6px;
}

.setting-segmented :deep(.el-segmented__item) {
	border-radius: 16px;
	border: none;
	background: transparent;
}

.setting-segmented :deep(.el-segmented__item-selected) {
	border-radius: 16px !important;
}

.setting-section-option {
	padding: 10px 24px;
	border-radius: 16px;
	transition: var(--animation-3s);
	font-size: 14px;
	color: var(--foreground);
}

.setting-container :deep(.el-segmented__item.is-selected) .setting-section-option {
	background-color: var(--foreground) !important;
	color: var(--background) !important;
}

.setting-content {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.setting-section {
	padding: 20px 24px;
	margin: 0;
	border-radius: 16px;
	min-height: 50px;
	background-color: var(--sidebar);
	border: 1px solid var(--sidebar-border);
}

.setting-section h2 {
	font-size: 15px;
	font-weight: 600;
	margin: 0 0 16px 0;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--sidebar-border);
	color: var(--foreground);
}

.setting-option {
	margin: 10px 0;
	padding: 14px 18px;
	min-height: 44px;
	border-radius: 16px;
	background-color: var(--background);
	border: 1px solid var(--sidebar-border);
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 14px;
	gap: 16px;
	transition: var(--animation-3s);
}

.setting-option:hover {
	border-color: var(--main-color);
}

.setting-option .iconfont {
	margin-right: 10px;
	font-size: 18px;
	color: var(--main-color);
}

.option-group {
	display: flex;
	width: fit-content;
	align-items: center;
	gap: 8px;
}

.option-title {
	font-size: 14px;
	min-width: 100px;
	margin-right: 0;
	user-select: none;
	color: var(--foreground);
}

.setting-option .el-select,
.setting-option .el-input,
.setting-option .el-input__wrapper {
	border-radius: 12px;
}

.setting-section .el-button--primary {
	border-radius: 16px !important;
	background-color: var(--foreground) !important;
	color: var(--background) !important;
	border-color: var(--foreground) !important;
}

.setting-section .el-button--primary:hover,
.setting-section .el-button--primary:focus {
	background-color: var(--foreground) !important;
	color: var(--background) !important;
	border-color: var(--foreground) !important;
	opacity: 0.9;
}

.el-checkbox-button.is-checked:first-child .el-checkbox-button__inner,
.el-checkbox-button__inner {
	font-size: 13px !important;
	border-radius: 16px !important;
}

.el-slider__button {
	background-color: var(--main-color) !important;
	border-color: var(--main-color) !important;
}

.el-slider__stop {
	background-color: var(--main-color) !important;
}

.llm-option img {
	height: 20px;
	width: 20px;
	margin-right: 8px;
}

.llm-option {
	display: flex;
	align-items: center;
	margin: 2px;
}
</style>