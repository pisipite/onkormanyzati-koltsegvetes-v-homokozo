<script setup lang="ts">
import { Download } from 'lucide-vue-next';

const { downloadXlsxFromClient: downloadBudgetXlsx } = await useBudgetData();
const { downloadConfigXlsxFromClient } = await useConfigData();
</script>

<template>
	<PageFrame title="Tételek követése">
		<PageSection>
			<p>
				A közgazdasági kiadási és bevételi nézet hierarchiáját hasonlíthatod össze
				évenként. A lenyitás párhuzamosan mutatja az azonos kódú tételeket. A tételek
				módosításai a <code>budget.xlsx</code>, az idősoros jelölések a
				<code>config.xlsx</code> fájlba kerülnek mentéskor.
			</p>
			<template #actions>
				<Button
					variant="secondary"
					@click="downloadBudgetXlsx"
				>
					<Download />
					budget.xlsx letöltése
				</Button>
				<Button
					variant="secondary"
					@click="downloadConfigXlsxFromClient"
				>
					<Download />
					config.xlsx letöltése
				</Button>
			</template>
		</PageSection>

		<div>
			<div class="mb-4 px-4 lg:px-8">
				<h2 class="text-lg font-semibold">Közgazdasági kiadások</h2>
			</div>
			<BudgetItemTracker side="expense" />
		</div>

		<div>
			<div class="mb-4 px-4 lg:px-8">
				<h2 class="text-lg font-semibold">Közgazdasági bevételek</h2>
			</div>
			<BudgetItemTracker side="income" />
		</div>
	</PageFrame>
	<!-- eslint-disable-next-line vue/no-multiple-template-root -->
	<ItemTrackerSaveBanner />
</template>
