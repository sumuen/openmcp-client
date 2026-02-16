<template>
	<div class="setting-section">
		<h2>{{ t('appearance-setting') }}</h2>
		<div class="setting-options">
		<div class="setting-option appearance-option">
			<span class="option-title">
				{{ t('setting.general-color-setting') }}
			</span>
			<div class="option-group">
				<el-color-picker 
					v-model="colorManager.mainColor" 
					@change="onGeneralColorChange"
					:predefine="predefinedColors"
					:size="'default'"
				/>
			</div>
		</div>
		<div class="setting-option appearance-doc-option">
			<span class="option-title">
				{{ t('setting.ui-color-doc-intro') }}
				<a
					class="appearance-doc-link"
					href="https://openmcp.kirigaya.cn/plugin-tutorial/usage/ui-color.html"
					target="_blank"
					rel="noopener noreferrer"
				>{{ t('setting.ui-color-doc-link') }}</a>
			</span>
		</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { defineComponent } from 'vue';
import { colorManager, onGeneralColorChange, predefinedColors } from './color';
import { useI18n } from 'vue-i18n';

defineComponent({ name: 'general' });
const { t } = useI18n();

</script>

<style scoped>
.appearance-option {
	align-items: center;
}

.appearance-option .option-group {
	gap: 12px;
}

:deep(.el-color-picker__trigger) {
	border-radius: 8px;
	border-color: var(--sidebar-border);
}

:deep(.el-color-picker__trigger:hover) {
	border-color: var(--main-color);
}

.appearance-doc-option {
	flex-wrap: wrap;
}

.appearance-doc-option .option-title {
	flex: 1;
	min-width: 100%;
	white-space: normal;
	line-height: 1.5;
}

.appearance-doc-link {
	color: var(--main-color);
	text-decoration: none;
	margin-left: 4px;
}

.appearance-doc-link:hover {
	text-decoration: underline;
}
</style>