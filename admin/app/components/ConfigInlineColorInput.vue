<script setup lang="ts">
const props = defineProps<{
	label: string;
	modelValue: string;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void;
}>();

const pickerValue = computed(() => {
	const value = props.modelValue.trim();
	if (/^#[\da-f]{6}$/i.test(value)) return value;
	if (/^#[\da-f]{3}$/i.test(value)) {
		return `#${value
			.slice(1)
			.split('')
			.map((character) => character.repeat(2))
			.join('')}`;
	}
	return '#000000';
});
</script>

<template>
	<div class="flex min-w-0 items-center gap-2">
		<span class="text-muted-foreground shrink-0 text-xs">{{ label }}</span>
		<Input
			:aria-label="`${label} színválasztó`"
			class="h-8 w-10 shrink-0 p-1"
			:model-value="pickerValue"
			type="color"
			@update:model-value="emit('update:modelValue', String($event))"
		/>
		<Input
			:aria-label="`${label} CSS-szín`"
			class="h-8 min-w-24 max-w-32 font-mono text-xs"
			:model-value="modelValue"
			placeholder="#000000"
			@update:model-value="emit('update:modelValue', String($event))"
		/>
	</div>
</template>
