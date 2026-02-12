<template>
	<div class="setting-section">
		<h2>{{ t('appearance-setting') }}</h2>
		<div class="setting-option appearance-option">
			<span class="option-title">
				<span class="iconfont icon-bg-colors"></span>
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
</style>