export default async function useTimelineCodeTracking() {
	const {
		deleteSheetRowByHeaderValue,
		ensureSheet,
		readConfigValue,
		readSheetHeaders,
		readSheetRows,
		upsertSheetRow,
	} = await useConfigData();

	const codeHeader = computed(() => {
		const headers = readSheetHeaders('kgr');
		return ['code', 'codes'].find((header) => headers.includes(header)) || headers[0] || 'code';
	});

	const isLimitEnabled = computed(() =>
		['1', 'true', 'igen'].includes(
			readConfigValue('timeseries.kgrOnly').trim().toLowerCase(),
		),
	);

	const ids = computed(
		() =>
			new Set(
				readSheetRows('kgr')
					.map((row) => (row.values[codeHeader.value] || '').trim())
					.filter(Boolean),
			),
	);

	function setEnabled(code: string, enabled: boolean) {
		const normalizedCode = code.trim();
		if (!isLimitEnabled.value || !normalizedCode) return;

		ensureSheet('kgr', [codeHeader.value]);
		if (enabled) {
			upsertSheetRow('kgr', codeHeader.value, normalizedCode, {
				[codeHeader.value]: normalizedCode,
			});
		} else {
			deleteSheetRowByHeaderValue('kgr', codeHeader.value, normalizedCode);
		}
	}

	return {
		ids,
		isLimitEnabled,
		setEnabled,
	};
}
