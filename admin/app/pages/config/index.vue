<script setup lang="ts">
import { Cog, Download, Save, Undo, Upload } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const loading = useLoading();
const { loadFunctionsTsvFromServer } = await useBudgetData();
const { reload: reloadCityName } = useCityName();
const {
	downloadConfigXlsxFromClient,
	isConfigModified,
	loadConfigXlsxFromServer,
	readCell,
	selectedSheetName,
	selectedSheetRange,
	sheetNames,
	uploadConfigXlsxToServer,
	writeCell,
} = await useConfigData();

const rows = computed(() =>
	Array.from({ length: selectedSheetRange.value.rowCount }, (_value, index) => index + 1),
);
const columns = computed(() =>
	Array.from({ length: selectedSheetRange.value.columnCount }, (_value, index) => index + 1),
);

async function newConfig() {
	if (!confirm('Biztosan felülírod az aktuális konfigot egy új, üres konfiggal?')) return;
	loading.value = 'Új konfig generálása...';
	try {
		await $fetch('/api/newConfig', { method: 'POST' });
		await loadConfigXlsxFromServer();
		await loadFunctionsTsvFromServer();
		await reloadCityName();
		toast.success('Új konfig sikeresen generálva!');
	} catch (e: unknown) {
		console.error(e);
		toast.error('Nem sikerült új konfigot generálni.');
	} finally {
		loading.value = false;
	}
}

async function uploadConfig(e: Event) {
	await upload('/api/config', 'config', e.target as HTMLInputElement);
	await loadConfigXlsxFromServer();
	await loadFunctionsTsvFromServer();
	await reloadCityName();
}

async function saveConfig() {
	const success = await uploadConfigXlsxToServer();
	if (!success) {
		toast.error('Nem sikerült elmenteni a konfigurációt.');
		return;
	}
	await loadConfigXlsxFromServer();
	await loadFunctionsTsvFromServer();
	await reloadCityName();
	toast.success('Konfiguráció sikeresen elmentve!');
}

async function revertConfigChanges() {
	if (!confirm('Biztosan el akarod vetni a konfiguráció módosításait?')) return;
	await loadConfigXlsxFromServer();
}

function updateCell(row: number, column: number, value: string | number) {
	writeCell(row, column, String(value));
}
</script>

<template>
	<PageFrame title="Konfiguráció">
		<PageSection v-if="isConfigModified">
			<p class="text-modification *:text-modification">
				<strong>A konfiguráció módosult, de még nincs elmentve</strong>
				a szerveren levő <code>config.xlsx</code> fájlba. A módosítások elvesznek a
				böngészőlap bezárásakor, újratöltésekor vagy új konfiguráció feltöltésekor.
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
				Itt tudod áttekinteni és szerkeszteni a <code>config.xlsx</code> munkalapjait. A
				módosítások először csak a böngészőben élnek, a szerveren levő fájl a Mentés gombbal
				frissül.
			</p>
			<div class="not-prose mt-4 flex flex-wrap gap-3">
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
			</div>
			<div class="not-prose mt-4 flex flex-col gap-4">
				<ConfigModulesForm />
				<ConfigBasicsForm />
				<ConfigSearchForm />
				<ConfigWelcomeForm />
				<ConfigPublicationForm />
				<ConfigBalanceForm />
				<ConfigBudgetVisForm />
				<ConfigMilestonesMapForm />
				<ConfigTimeseriesForm />
				<ConfigFeedbackForm />
			</div>
		</PageSection>
		<PageSection>
			<p>
				Az alábbi táblázatos nézetben a teljes <code>config.xlsx</code> tartalma látható. A
				fenti űrlap által kezelt mezők itt is ugyanazokat az Excel-cellákat módosítják.
			</p>
			<div class="not-prose flex flex-col gap-4">
				<div class="flex flex-wrap items-center gap-3">
					<Label for="config-sheet">Munkalap</Label>
					<Select
						id="config-sheet"
						v-model="selectedSheetName"
					>
						<SelectTrigger class="min-w-56">
							<SelectValue placeholder="Munkalap kiválasztása" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem
								v-for="sheetName in sheetNames"
								:key="sheetName"
								:value="sheetName"
							>
								{{ sheetName }}
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div class="max-h-[70vh] overflow-auto rounded-md border">
					<table class="w-full min-w-max border-collapse text-sm">
						<thead class="bg-muted sticky top-0 z-10">
							<tr>
								<th
									class="text-muted-foreground w-12 border-r px-2 py-2 text-right font-medium"
								>
									#
								</th>
								<th
									v-for="column in columns"
									:key="column"
									class="text-muted-foreground min-w-48 border-r px-2 py-2 text-left font-medium"
								>
									{{ column }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="row in rows"
								:key="row"
								class="odd:bg-muted/20"
							>
								<th
									class="text-muted-foreground border-r px-2 py-1 text-right font-medium"
								>
									{{ row }}
								</th>
								<td
									v-for="column in columns"
									:key="`${row}-${column}`"
									class="border-r border-b p-0"
								>
									<Input
										class="h-9 min-w-48 rounded-none border-0 shadow-none focus-visible:ring-1"
										:model-value="readCell(row, column)"
										@update:model-value="updateCell(row, column, $event)"
									/>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</PageSection>
		<PageSection>
			<p>
				A honlap konfigurációs beállításait egy sablon alapján Excel fájlon keresztül lehet
				szerkeszteni. A sablon paramétereihez annak egyes munkalapjai tartalmaznak
				segítséget, az Excel fájl szerkezetéről a
				<a
					href="https://github.com/k-monitor/onkormanyzati-koltsegvetes-v2#inputconfigxlsx"
					target="_blank"
					>dokumentációban</a
				>
				található részletes információ. Feltöltéskor a fájl neve mindegy, a meglevő
				<code>config.xlsx</code> fájl lesz felülírva vele. Excel 2007-O365 (*.xlsx) fájlt
				kell feltölteni.
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
		<PageSection>
			<p>
				Új konfiguráció generálásakor a meglévő felülíródik: minden kézzel beírt érték
				törlődik, és új tooltip munkalapok jönnek létre a <code>budget.xlsx</code>-nek
				megfelelően.
			</p>
			<template #actions>
				<Button
					variant="destructive"
					@click="newConfig"
				>
					<Cog />
					Új konfig
				</Button>
			</template>
		</PageSection>
	</PageFrame>
</template>
