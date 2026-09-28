<script setup lang="ts">
const props = defineProps<{
	balanceCode: string;
	balanceColor: string;
	economicCode: string;
	economicColor: string;
}>();

const emit = defineEmits<{
	(e: 'updateBalanceColor' | 'updateEconomicColor', value: string): void;
}>();

const useSeparateColors = ref(
	Boolean(
		props.balanceCode &&
			props.economicCode &&
			props.balanceColor !== props.economicColor,
	),
);

watch(
	() => [props.balanceColor, props.economicColor],
	([balanceColor, economicColor]) => {
		if (balanceColor !== economicColor) useSeparateColors.value = true;
	},
);

const hasBothCodes = computed(() => Boolean(props.balanceCode && props.economicCode));
const sharedColor = computed(() => props.balanceColor || props.economicColor || '#000000');

function updateSharedColor(value: string) {
	if (props.balanceCode) emit('updateBalanceColor', value);
	if (props.economicCode) emit('updateEconomicColor', value);
}

function updateBalanceColor(value: string) {
	if (hasBothCodes.value && !useSeparateColors.value) {
		updateSharedColor(value);
		return;
	}
	emit('updateBalanceColor', value);
}

function updateEconomicColor(value: string) {
	if (hasBothCodes.value && !useSeparateColors.value) {
		updateSharedColor(value);
		return;
	}
	emit('updateEconomicColor', value);
}

function setUseSeparateColors(value: boolean) {
	useSeparateColors.value = value;
	if (value || !hasBothCodes.value) return;
	emit('updateBalanceColor', sharedColor.value);
	emit('updateEconomicColor', sharedColor.value);
}
</script>

<template>
	<div class="grid gap-2 border-t px-3 py-2.5 first:border-t-0 lg:grid-cols-[3.75rem_4.5rem_minmax(8rem,1fr)_minmax(8rem,1fr)_3.5rem] lg:items-center">
		<div class="flex items-center justify-between gap-3 lg:block">
			<span class="text-muted-foreground text-xs lg:hidden">Mérlegkód</span>
			<code class="text-sm">{{ balanceCode || 'nincs' }}</code>
		</div>
		<div class="flex items-center justify-between gap-3 lg:block">
			<span class="text-muted-foreground text-xs lg:hidden">Közg. kód</span>
			<code class="text-sm">{{ economicCode || 'nincs' }}</code>
		</div>

		<div v-if="balanceCode">
			<ConfigInlineColorInput
				label="Mérleg"
				label-class="lg:sr-only"
				:model-value="balanceColor"
				@update:model-value="updateBalanceColor"
			/>
		</div>
		<div
			v-else
			class="text-muted-foreground text-xs"
		>
			<span class="lg:hidden">Mérleg: </span>nincs
		</div>

		<div v-if="economicCode">
			<ConfigInlineColorInput
				label="Közg."
				label-class="lg:sr-only"
				:model-value="economicColor"
				@update:model-value="updateEconomicColor"
			/>
		</div>
		<div
			v-else
			class="text-muted-foreground text-xs"
		>
			<span class="lg:hidden">Közg.: </span>nincs
		</div>

		<div
			v-if="hasBothCodes"
			class="flex items-center justify-between gap-3 lg:justify-end"
		>
			<span class="text-muted-foreground text-xs lg:hidden">Eltérő színek</span>
			<button
				:aria-checked="useSeparateColors"
				:aria-label="`Eltérő színek: ${balanceCode} és ${economicCode}`"
				class="border-input bg-background data-[state=checked]:bg-primary relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border px-1 transition-colors"
				:data-state="useSeparateColors ? 'checked' : 'unchecked'"
				role="switch"
				type="button"
				@click="setUseSeparateColors(!useSeparateColors)"
			>
				<span
					class="bg-background pointer-events-none block size-5 rounded-full border shadow-sm transition-transform data-[state=checked]:translate-x-5"
					:data-state="useSeparateColors ? 'checked' : 'unchecked'"
				/>
			</button>
		</div>
		<div v-else />
	</div>
</template>
