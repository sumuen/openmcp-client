<template>
    <el-scrollbar height="100%">
        <div class="tool-module">
            <div class="menu-bar">
                <el-segmented v-model="activeView" :options="menuOptions" size="default" />
            </div>
            <div class="content-area">
                <keep-alive>
                    <component :is="currentView" :tab-id="props.tabId" />
                </keep-alive>
            </div>
        </div>

    </el-scrollbar>
</template>

<script setup lang="ts">
import { defineProps, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ToolDebug from './tool-debug/index.vue';
import Flow from './flow/index.vue';
import VariableManagement from './variable-management/index.vue';
const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});


const activeView = ref('cases');

const menuOptions = [
    { label: t('tool-debug'), value: 'cases' },
    { label: t('variable-management'), value: 'variable-management' },
    { label: t('test-flow'), value: 'flow' },
];

const currentView = computed(() => {
    if (activeView.value === 'variable-management') {
        return VariableManagement;
    } else if (activeView.value === 'flow') {
        return Flow;
    } else {
        return ToolDebug;
    }

});
</script>

<style scoped>
.tool-module {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.menu-bar {
    margin-bottom: 20px;
}

.content-area {
    flex: 1;
    overflow: hidden;
}

.tool-module .left {
    width: 45%;
    max-width: 410px;
}

.tool-module .right {
    width: 45%;
}
</style>