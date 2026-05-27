<script setup lang="ts">
const { moduleKey } = defineProps<{
	moduleKey: string;
}>();

const { readConfigValue } = await useConfigData();

const isEnabled = computed(() =>
	['1', 'true', 'igen'].includes(readConfigValue(`modules.${moduleKey}`).trim().toLowerCase()),
);
</script>

<template>
	<span
		:aria-label="isEnabled ? 'Bekapcsolva' : 'Kikapcsolva'"
		class="inline-block size-2.5 rounded-full"
		:class="isEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'"
	/>
</template>
