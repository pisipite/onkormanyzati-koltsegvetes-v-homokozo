<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const props = withDefaults(
	defineProps<{
		confirmMessage?: string;
		errorMessage?: string;
		refreshAppData?: boolean;
		sticky?: boolean;
		successMessage?: string;
		title?: string;
	}>(),
	{
		confirmMessage: 'Biztosan el akarod vetni a konfigurációs módosításokat?',
		errorMessage: 'Nem sikerült elmenteni a konfigurációt.',
		refreshAppData: false,
		sticky: true,
		successMessage: 'Konfiguráció sikeresen elmentve!',
		title: 'Nem mentett konfigurációs módosítások',
	},
);

const {
	isConfigModified,
	loadConfigXlsxFromServer,
	uploadConfigXlsxToServer,
} = await useConfigData();
const { loadFunctionsTsvFromServer } = await useBudgetData();
const { reload: reloadCityName } = useCityName();

function revertChanges() {
	if (!confirm(props.confirmMessage)) return;
	return loadConfigXlsxFromServer();
}

async function save() {
	if (!isConfigModified.value) return;
	const success = await uploadConfigXlsxToServer();
	if (!success) {
		toast.error(props.errorMessage);
		return;
	}
	await loadConfigXlsxFromServer();
	if (props.refreshAppData) {
		await Promise.all([loadFunctionsTsvFromServer(), reloadCityName()]);
	}
	toast.success(props.successMessage);
}
</script>

<template>
	<div
		v-if="isConfigModified"
		class="flex items-center justify-between gap-4 border-t border-b bg-white px-4 py-0!"
		:class="sticky && 'sticky bottom-0'"
	>
		<Alert class="text-modification border-0 bg-transparent">
			<CircleAlert />
			<AlertTitle>{{ title }}</AlertTitle>
			<AlertDescription>
				Ha nem mented őket a szerverre, akkor elveszhetnek!
			</AlertDescription>
		</Alert>
		<Button
			variant="modification"
			@click="revertChanges"
			>Elvetés</Button
		>
		<Button @click="save">Mentés</Button>
	</div>
</template>
