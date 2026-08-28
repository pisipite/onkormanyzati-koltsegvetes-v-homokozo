<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

withDefaults(defineProps<{ sticky?: boolean }>(), {
	sticky: true,
});

const { loadBudgetXlsxFromServer, uploadBudgetXlsxToServer } = await useBudgetData();
const { isBudgetModified } = useModifications();

function revertChanges() {
	if (!confirm('Biztosan el akarod vetni a módosításokat?')) return;
	return loadBudgetXlsxFromServer();
}

async function save() {
	if (!isBudgetModified.value) return;
	const saved = await uploadBudgetXlsxToServer();
	if (!saved) {
		toast.error('Nem sikerült elmenteni a költségvetést.');
		return;
	}
	await loadBudgetXlsxFromServer();
	toast.success('Költségvetés sikeresen elmentve!');
}
</script>

<template>
	<div
		v-if="isBudgetModified"
		class="flex items-center justify-between gap-4 border-t border-b bg-white px-4 py-0!"
		:class="sticky && 'sticky bottom-0'"
	>
		<Alert
			v-if="isBudgetModified"
			class="text-modification border-0 bg-transparent"
		>
			<CircleAlert />
			<AlertTitle>Nem mentett költségvetés módosítások</AlertTitle>
			<AlertDescription>
				<span>
					Ha nem mented őket a szerverre, akkor elveszhetnek!
					<NuxtLink
						class="font-bold underline"
						to="/budget/"
						>Részletek</NuxtLink
					>
				</span>
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
