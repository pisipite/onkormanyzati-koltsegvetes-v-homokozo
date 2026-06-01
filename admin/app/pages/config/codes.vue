<script setup lang="ts">
import { Download, Save, Undo, Upload } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const { loadFunctionsTsvFromServer } = await useBudgetData();
const {
	downloadConfigXlsxFromClient,
	isConfigModified,
	loadConfigXlsxFromServer,
	uploadConfigXlsxToServer,
} = await useConfigData();

async function uploadConfig(e: Event) {
	await upload('/api/config', 'config', e.target as HTMLInputElement);
	await loadConfigXlsxFromServer();
	await loadFunctionsTsvFromServer();
}

async function saveConfig() {
	const success = await uploadConfigXlsxToServer();
	if (!success) {
		toast.error('Nem sikerült elmenteni a rovatkódokat.');
		return;
	}
	await loadConfigXlsxFromServer();
	await loadFunctionsTsvFromServer();
	toast.success('Rovatkódok sikeresen elmentve!');
}

async function revertConfigChanges() {
	if (!confirm('Biztosan el akarod vetni a rovatkódok módosításait?')) return;
	await loadConfigXlsxFromServer();
}
</script>

<template>
	<PageFrame title="Rovatkódok követése">
		<PageSection v-if="isConfigModified">
			<p class="text-modification *:text-modification">
				<strong>A rovatkódok módosultak, de még nincsenek elmentve</strong>
				a szerveren levő <code>config.xlsx</code> fájlba.
			</p>
			<template #actions>
				<Button
					variant="secondary"
					@click="downloadConfigXlsxFromClient"
				>
					<Download />
					Letöltés
				</Button>
				<Button @click="saveConfig">
					<Save />
					Mentés
				</Button>
				<Button
					class="ml-auto"
					variant="modification"
					@click="revertConfigChanges"
				>
					<Undo />
					Elvetés
				</Button>
			</template>
		</PageSection>

		<PageSection>
			<p>
				Itt tudod ellenőrizni és szerkeszteni a költségvetési rovatkódokhoz tartozó
				súgószövegeket és az idősoros ábrán megjelenő KGR-listát. A módosítások a
				<code>config.xlsx</code> fájlba kerülnek mentéskor.
			</p>
			<template #actions>
				<Button
					variant="secondary"
					@click="downloadConfigXlsxFromClient"
				>
					<Download />
					Letöltés
				</Button>
				<Button as-child>
					<label>
						<Upload />
						Feltöltés
						<input
							style="display: none"
							type="file"
							@change="uploadConfig"
						>
					</label>
				</Button>
			</template>
		</PageSection>

		<div class="px-4 lg:px-8">
			<ConfigCodeRegistry />
		</div>
	</PageFrame>
</template>
