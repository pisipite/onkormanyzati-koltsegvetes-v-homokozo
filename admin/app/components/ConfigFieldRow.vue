<script setup lang="ts">
defineProps<{
	help?: string;
	label: string;
}>();
</script>

<template>
	<div
		class="grid grid-cols-1 border-b last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"
	>
		<div class="flex items-center gap-2 px-4 py-3">
			<Label>{{ label }}</Label>
			<ConfigHelpButton :help="help" />
		</div>
		<div class="border-t px-4 py-3 md:border-t-0 md:border-l">
			<slot />
		</div>
	</div>
</template>
