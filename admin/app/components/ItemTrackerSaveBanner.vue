<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const {
	loadFunctionsTsvFromServer,
	loadBudgetXlsxFromServer,
	pending: budgetPending,
	uploadBudgetXlsxToServer,
} = await useBudgetData();
const {
	isConfigModified,
	loadConfigXlsxFromServer,
	pending: configPending,
	uploadConfigXlsxToServer,
} = await useConfigData();
const { isBudgetModified } = useModifications();
const { reload: reloadCityName } = useCityName();

const isWorking = ref(false);
const hasModifications = computed(
	() => isBudgetModified.value || isConfigModified.value,
);
const modifiedWorkbookNames = computed(() =>
	[
		isBudgetModified.value && 'budget.xlsx',
		isConfigModified.value && 'config.xlsx',
	].filter((name): name is string => Boolean(name)),
);
const modifiedWorkbookLabel = computed(() => modifiedWorkbookNames.value.join(' és '));

async function refreshConfigDependencies() {
	await Promise.all([loadFunctionsTsvFromServer(), reloadCityName()]);
}

async function revertChanges() {
	const revertBudget = isBudgetModified.value;
	const revertConfig = isConfigModified.value;
	if (!revertBudget && !revertConfig) return;
	if (
		!confirm(
			`Biztosan el akarod vetni a(z) ${modifiedWorkbookLabel.value} módosításait?`,
		)
	) {
		return;
	}

	isWorking.value = true;
	try {
		await Promise.all([
			revertBudget ? loadBudgetXlsxFromServer() : Promise.resolve(),
			revertConfig ? loadConfigXlsxFromServer() : Promise.resolve(),
		]);
		if (revertConfig) await refreshConfigDependencies();
	} finally {
		isWorking.value = false;
	}
}

async function save() {
	const saveBudget = isBudgetModified.value;
	const saveConfig = isConfigModified.value;
	if (!saveBudget && !saveConfig) return;

	isWorking.value = true;
	try {
		const budgetSaved = saveBudget ? await uploadBudgetXlsxToServer() : true;
		const configSaved = saveConfig ? await uploadConfigXlsxToServer() : true;

		if (saveBudget && budgetSaved) await loadBudgetXlsxFromServer();
		if (saveConfig && configSaved) {
			await loadConfigXlsxFromServer();
			await refreshConfigDependencies();
		}

		const savedNames = [
			saveBudget && budgetSaved && 'budget.xlsx',
			saveConfig && configSaved && 'config.xlsx',
		].filter((name): name is string => Boolean(name));
		const failedNames = [
			saveBudget && !budgetSaved && 'budget.xlsx',
			saveConfig && !configSaved && 'config.xlsx',
		].filter((name): name is string => Boolean(name));

		if (!failedNames.length) {
			toast.success(`${savedNames.join(' és ')} sikeresen elmentve.`);
		} else if (savedNames.length) {
			toast.error(
				`${savedNames.join(' és ')} mentése sikerült, de ${failedNames.join(' és ')} mentése nem.`,
			);
		} else {
			toast.error(`${failedNames.join(' és ')} mentése nem sikerült.`);
		}
	} finally {
		isWorking.value = false;
	}
}
</script>

<template>
	<div
		v-if="hasModifications"
		class="sticky bottom-0 z-30 flex w-full flex-wrap items-center justify-between gap-4 border-t border-b bg-white px-4 py-0! md:max-w-[calc(100vw-var(--sidebar-width))]"
	>
		<Alert class="text-modification min-w-0 flex-1 border-0 bg-transparent">
			<CircleAlert />
			<AlertTitle>Nem mentett módosítások</AlertTitle>
			<AlertDescription>
				Érintett munkafüzet: <strong>{{ modifiedWorkbookLabel }}</strong>. Ha nem mented a
				változtatásokat, elveszhetnek!
			</AlertDescription>
		</Alert>
		<div class="ml-auto flex shrink-0 gap-4">
			<Button
				:disabled="isWorking || budgetPending || configPending"
				variant="modification"
				@click="revertChanges"
			>
				Elvetés
			</Button>
			<Button
				:disabled="isWorking || budgetPending || configPending"
				@click="save"
			>
				Mentés
			</Button>
		</div>
	</div>
</template>
