<template>
	<div class="about-container">
		<span class="about-icon-container">
			<div class="openmcp-image"></div>
			<span>OpenMCP</span>
		</span>

		<p>
			{{ t('openmcp-developed-by', { version, author }) }}
		</p>


		<div style="display: inline-flex;">
			<el-button class="join-qq" type="primary"
				@click="gotoWebsite('https://github.com/LSTM-Kirigaya/openmcp-client')">
				<span class="iconfont icon-star"></span>
				{{ t('star-our-project') }}
			</el-button>

			<el-button class="join-qq" type="primary" @click="gotoWebsite('https://openmcp.kirigaya.cn')">
				<span class="iconfont icon-wendang"></span>
				{{ t('document') }}
			</el-button>
		</div>

		<br>

		<div style="display: inline-flex;">
			<el-button class="join-qq" type="primary"
				@click="gotoWebsite('https://qm.qq.com/cgi-bin/qm/qr?k=C6ZUTZvfqWoI12lWe7L93cWa1hUsuVT0&jump_from=webapi&authKey=McW6B1ogTPjPDrCyGttS890tMZGQ1KB3QLuG4aqVNRaYp4vlTSgf2c6dMcNjMuBD')">
				<span class="iconfont icon-QQ"></span>
				{{ t('join-discussion') }}
			</el-button>
			<el-button type="primary" class="join-qq btn-primary"
				@click="gotoWebsite('https://marketplace.visualstudio.com/items?itemName=kirigaya.openmcp&ssr=false#review-details')">
				<span class="iconfont icon-star"></span>
				{{ t('comment-for-us') }}
			</el-button>
		</div>

	</div>
</template>

<script setup lang="ts">
import { gotoWebsite } from '@/hook/util';
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const version = '0.1.13';
const author = 'LSTM-Kirigaya (锦恢)';

defineComponent({ name: 'about' });

</script>

<style>
.about-container {
	text-align: center;
	height: 90%;
	display: flex;
	align-items: center;
	flex-direction: column;
	justify-content: center;
}

.about-icon-container {
	box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.2);
	border-radius: 16px;
	padding: 24px 40px;
	background-color: var(--background);
	border: 1px solid var(--sidebar-border);
	display: flex;
	font-size: 30px;
	flex-direction: column;
	margin-bottom: 24px;
}

.about-icon-container span {
	color: var(--foreground);
	font-weight: bold;
	font-size: 40px;
}

.about-icon-container .iconfont {
	font-size: 180px;
}

.about-container>span>img {
	height: 150px;
	width: 150px;
}

.about-container .openmcp-image {
	width: 245px;
	height: 205px;
}

.about-container>.qr-code {
	height: 180px;
	border: 1px solid var(--sidebar-border);
	border-radius: 16px;
	background-color: var(--sidebar);
}

.about-container p {
	color: var(--foreground);
	margin-bottom: 24px;
}

.about-container .el-button.join-qq {
	border-radius: 16px;
	background-color: var(--foreground) !important;
	color: var(--background) !important;
	border: 1px solid var(--foreground) !important;
	padding: 10px 20px;
	margin: 0 6px 12px;
	transition: var(--animation-3s);
}

.about-container .el-button.join-qq:hover {
	opacity: 0.9;
	background-color: var(--foreground) !important;
	color: var(--background) !important;
	border-color: var(--foreground) !important;
}

.about-container .el-button.join-qq.btn-primary,
.about-container .el-button.join-qq.btn-primary:hover,
.about-container .el-button.join-qq.btn-primary:focus,
.about-container .el-button.join-qq.btn-primary:active {
	background-color: var(--main-color) !important;
	color: var(--button-text) !important;
	border-color: var(--main-color) !important;
}

.about-container .el-button.join-qq.btn-primary:hover {
	opacity: 0.9;
}

.join-qq .iconfont {
	font-size: 18px;
	margin-right: 8px;
}
</style>