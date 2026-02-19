<template>
	<div class="setting-options">
		<div class="setting-option">
			<span class="option-title">{{ t('preset') }}</span>
			<el-switch
				v-model="envEnabled"
				@change="(enable: boolean) => client.handleEnvSwitch(enable)"
				inline-prompt
				:active-text="t('preset')"
				:inactive-text="t('preset')"
			/>
		</div>
		<div class="setting-option setting-option-add">
			<span class="option-title">{{ t('add-env-var') }}</span>
			<div class="setting-option-inputs">
				<el-input
					v-model="client.connectionEnvironment.newKey"
					:placeholder="t('key')"
					@keyup.enter="addEnvVar"
				/>
				<el-input
					v-model="client.connectionEnvironment.newValue"
					:placeholder="t('value')"
					@keyup.enter="addEnvVar"
				/>
				<el-button type="primary" circle @click="addEnvVar">
					<span class="iconfont icon-add"></span>
				</el-button>
			</div>
		</div>
		<div
			v-for="(option, idx) of client.connectionEnvironment.data"
			:key="idx"
			class="setting-option setting-option-env-row"
		>
			<span class="option-title option-title--muted">{{ option.key || t('key') }}</span>
			<div class="setting-option-inputs">
				<el-input v-model="option.key" :placeholder="t('key')" />
				<el-input v-model="option.value" type="password" show-password :placeholder="t('value')" />
				<el-button type="danger" circle @click="deleteEnvVar(option)">
					<span class="iconfont icon-delete"></span>
				</el-button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, defineComponent, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { mcpClientAdapter } from './core';
import type { EnvItem } from './type';

defineComponent({ name: 'env-var' });
const props = defineProps({
	index: {
		type: Number,
		required: true
	}
});

const client = computed(() => mcpClientAdapter.clients[props.index]);

const { t } = useI18n();

/**
 * @description 添加环境变量
 */
function addEnvVar() {
	const currentKey = client.value.connectionEnvironment.newKey;
	const currentValue = client.value.connectionEnvironment.newValue;

	if (currentKey.length === 0 || currentValue.length === 0) {
		return;
	}

	const sameNameItems = client.value.connectionEnvironment.data.filter(item => item.key === currentKey);

	if (sameNameItems.length > 0) {
		const conflictItem = sameNameItems[0];
		conflictItem.value = currentValue;
	} else {
		client.value.connectionEnvironment.data.push({
			key: currentKey,
			value: currentValue
		});
		client.value.connectionEnvironment.newKey = '';
		client.value.connectionEnvironment.newValue = '';
	}
}

watch(
	() => client.value.connectionEnvironment.data,
	() => {
		mcpClientAdapter.saveLaunchSignature();
	},
	{ deep: true }
);

/**
 * @description 删除环境变量
 */
function deleteEnvVar(option: EnvItem) {
	const currentKey = option.key;
	const reserveItems = client.value.connectionEnvironment.data.filter(item => item.key !== currentKey);
	client.value.connectionEnvironment.data = reserveItems;
}

const envEnabled = ref(true);
</script>

<style scoped>
.setting-option-inputs {
	display: flex;
	align-items: center;
	gap: 10px;
	flex: 1;
	min-width: 0;
}

.setting-option-inputs :deep(.el-input) {
	flex: 1;
	min-width: 0;
}

.setting-option-inputs :deep(.el-input__wrapper) {
	border-radius: 12px;
}

.setting-option-add .setting-option-inputs,
.setting-option-env-row .setting-option-inputs {
	flex-wrap: wrap;
}

.option-title--muted {
	color: var(--sidebar-border);
	font-size: 13px;
}

.setting-option-inputs .el-button.is-circle {
	padding: 8px;
	flex-shrink: 0;
}

.setting-option-inputs .el-button .iconfont {
	font-size: 14px;
}
</style>
