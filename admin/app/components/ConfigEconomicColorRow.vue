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

function setUseSeparateColors(value: boolean) {
	useSeparateColors.value = value;
	if (value || !hasBothCodes.value) return;
	emit('updateBalanceColor', sharedColor.value);
	emit('updateEconomicColor', sharedColor.value);
}
</script>

<template>
	<div class="grid gap-3 border-t px-3 py-3 first:border-t-0 lg:grid-cols-[7rem_8rem_minmax(0,1fr)_6rem] lg:items-center">
		<div class="flex items-center justify-between gap-3 lg:block">
			<span class="text-muted-foreground text-xs lg:hidden">Mérlegkód</span>
			<code class="text-sm">{{ balanceCode || 'nincs' }}</code>
		</div>
		<div class="flex items-center justify-between gap-3 lg:block">
			<span class="text-muted-foreground text-xs lg:hidden">Közgazdasági kód</span>
			<code class="text-sm">{{ economicCode || 'nincs' }}</code>
		</div>

		<div
			v-if="hasBothCodes && useSeparateColors"
			class="flex flex-wrap gap-x-4 gap-y-2"
		>
			<ConfigInlineColorInput
				label="Mérleg"
				:model-value="balanceColor"
				@update:model-value="emit('updateBalanceColor', $event)"
			/>
			<ConfigInlineColorInput
				label="Közgazdasági"
				:model-value="economicColor"
				@update:model-value="emit('updateEconomicColor', $event)"
			/>
		</div>
		<ConfigInlineColorInput
			v-else
			:label="hasBothCodes ? 'Közös' : balanceCode ? 'Mérleg' : 'Közgazdasági'"
			:model-value="sharedColor"
			@update:model-value="updateSharedColor"
		/>

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
	</div>
</template>
