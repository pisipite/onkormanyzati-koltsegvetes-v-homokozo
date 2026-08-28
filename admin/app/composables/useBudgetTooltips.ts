export type BudgetTooltipEntry = {
	name: string;
	rowNumber: number;
	text: string;
};

const tooltipIdHeader = 'Azon.';
const tooltipNameHeader = 'Megnevezés';
const tooltipTextHeader = 'Súgószöveg';

export default async function useBudgetTooltips(
	years: Ref<string[]> | ComputedRef<string[]>,
) {
	const { ensureSheet, readSheetRows, upsertSheetRow } = await useConfigData();

	const entriesByYear = computed(() => {
		const result = new Map<string, Map<string, BudgetTooltipEntry>>();
		for (const year of years.value) {
			const entries = new Map<string, BudgetTooltipEntry>();
			for (const row of readSheetRows(`tooltips ${year}`)) {
				const id = (row.values[tooltipIdHeader] || '').trim();
				if (!id) continue;
				entries.set(id, {
					name: row.values[tooltipNameHeader] || '',
					rowNumber: row.rowNumber,
					text: row.values[tooltipTextHeader] || '',
				});
			}
			result.set(year, entries);
		}
		return result;
	});

	function getEntry(year: string, code: string) {
		return entriesByYear.value.get(year)?.get(code);
	}

	function setTooltip(year: string, code: string, name: string, text: string) {
		if (!year || !code) return;
		const sheetName = `tooltips ${year}`;
		ensureSheet(sheetName, [tooltipIdHeader, tooltipNameHeader, tooltipTextHeader]);
		upsertSheetRow(sheetName, tooltipIdHeader, code, {
			[tooltipIdHeader]: code,
			[tooltipNameHeader]: name,
			[tooltipTextHeader]: text,
		});
	}

	return {
		getEntry,
		setTooltip,
	};
}
