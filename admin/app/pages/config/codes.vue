<script setup lang="ts">
import { Download, Upload } from 'lucide-vue-next';

const { loadFunctionsTsvFromServer } = await useBudgetData();
const {
	downloadConfigXlsxFromClient,
	loadConfigXlsxFromServer,
} = await useConfigData();

async function uploadConfig(e: Event) {
	await upload('/api/config', 'config', e.target as HTMLInputElement);
	await loadConfigXlsxFromServer();
	await loadFunctionsTsvFromServer();
}

</script>

<template>
	<PageFrame title="Rovatkódok követése">
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
	<!-- eslint-disable-next-line vue/no-multiple-template-root -->
	<ConfigSaveBanner
		confirm-message="Biztosan el akarod vetni a rovatkódok módosításait?"
		error-message="Nem sikerült elmenteni a rovatkódokat."
		refresh-app-data
		success-message="Rovatkódok sikeresen elmentve!"
		title="Nem mentett rovatkód-módosítások"
	/>
</template>
