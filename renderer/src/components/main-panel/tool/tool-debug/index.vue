<template>
    <el-scrollbar height="100%">
        <div class="tool-module">
            <div class="left">
                <h2>
                    <span class="iconfont icon-tool"></span>
                    {{ t('tool-module') }}
                </h2>
                <ToolList :tab-id="props.tabId"></ToolList>
            </div>
            <div class="right">
                    <div class="menu-bar">
                        <el-segmented v-model="activeView" :options="menuOptions" size="default" />
                    </div>
                    <div class="content-area">
                        <keep-alive>
                            <component :is="currentView" :tab-id="props.tabId" />
                        </keep-alive>
                    </div>
                </div>
        </div>
    </el-scrollbar>
</template>

<script setup lang="ts">
import { defineProps, ref, computed } from 'vue';
import ToolList from './tool-list.vue';
import { useI18n } from 'vue-i18n';
import RunDebug from './run-debug/index.vue';
import VariableExtraction from './variable-extraction/index.vue';
import TestCases from './test-cases/index.vue';
const { t } = useI18n();

const props = defineProps({
    tabId: {
        type: Number,
        required: true
    }
});

const activeView = ref('run-debug');

const menuOptions = [
    { label: t('run-debug'), value: 'run-debug' },
    { label: t('test-cases'), value: 'test-cases' },
    { label: t('variable-extraction'), value: 'variable-extraction' },
];

const currentView = computed(() => {
    if (activeView.value === 'run-debug') {
        return RunDebug;
    } else if (activeView.value === 'test-cases') {
        return TestCases;
    } else {
        return VariableExtraction;
    }

});

</script>

<style scoped>
.tool-module {
    padding: 20px;
    height: 100%;
    display: flex;
    justify-content: space-around;
}

.tool-module .left {
    width: 45%;
    max-width: 410px;
}

.tool-module .right {
    width: 45%;
}
</style>