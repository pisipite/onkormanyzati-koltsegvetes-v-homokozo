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
	<div class="bg-background grid gap-2 rounded-md border p-3">
		<span class="text-sm font-medium">{{ label }}</span>
		<div class="flex items-center gap-2">
			<Input
				:aria-label="`${label} színválasztó`"
				class="h-10 w-14 p-1"
				:model-value="pickerValue"
				type="color"
				@update:model-value="emit('update:modelValue', String($event))"
			/>
			<Input
				:aria-label="`${label} CSS-szín`"
				:model-value="modelValue"
				placeholder="#000000"
				@update:model-value="emit('update:modelValue', String($event))"
			/>
		</div>
	</div>
</template>
