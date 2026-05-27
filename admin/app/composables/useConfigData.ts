import type { Cell, CellValue, Workbook, Worksheet } from 'exceljs';

function isFormulaValue(value: CellValue): value is Exclude<CellValue, null | undefined> & {
	formula: string;
} {
	return !!value && typeof value === 'object' && 'formula' in value;
}

function isRichTextValue(value: CellValue): value is Exclude<CellValue, null | undefined> & {
	richText: Array<{ text: string }>;
} {
	return !!value && typeof value === 'object' && 'richText' in value;
}

function isHyperlinkValue(value: CellValue): value is Exclude<CellValue, null | undefined> & {
	text: string;
} {
	return !!value && typeof value === 'object' && 'text' in value;
}

function cellValueToText(value: CellValue): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	if (typeof value === 'object') {
		if (isFormulaValue(value)) return `=${value.formula}`;
		if (isRichTextValue(value)) return value.richText.map((part) => part.text).join('');
		if (isHyperlinkValue(value)) return value.text;
		return String(value);
	}
	return String(value);
}

function textToCellValue(text: string, previousValue: CellValue): CellValue {
	const trimmed = text.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith('=')) return { formula: trimmed.slice(1) };
	if (typeof previousValue === 'number') {
		const parsed = Number(trimmed.replace(/\s/g, '').replace(',', '.'));
		return Number.isNaN(parsed) ? text : parsed;
	}
	if (typeof previousValue === 'boolean') {
		return ['1', 'true', 'igen'].includes(trimmed.toLowerCase());
	}
	if (previousValue instanceof Date) {
		const parsed = new Date(trimmed);
		return Number.isNaN(parsed.getTime()) ? text : parsed;
	}
	return text;
}

function writeCellText(cell: Cell, value: string) {
	const previousValue = cell.value;
	const previousText = cellValueToText(previousValue);
	if (previousText === value) return false;
	cell.value = textToCellValue(value, previousValue);
	return true;
}

function findUsedRange(sheet: Worksheet) {
	let rowCount = 0;
	let columnCount = 0;

	sheet.eachRow({ includeEmpty: false }, (row) => {
		rowCount = Math.max(rowCount, row.number);
		row.eachCell({ includeEmpty: false }, (_cell, columnNumber) => {
			columnCount = Math.max(columnCount, columnNumber);
		});
	});

	return {
		columnCount: Math.max(columnCount, 1),
		rowCount: Math.max(rowCount, 1),
	};
}

function findConfigRow(sheet: Worksheet, key: string) {
	const { rowCount } = findUsedRange(sheet);
	for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
		const row = sheet.getRow(rowNumber);
		if (cellValueToText(row.getCell(1).value).trim() === key) {
			return row;
		}
	}
	return undefined;
}

function findLastConfigRowNumber(sheet: Worksheet, prefix: string, fallbackKey: string) {
	let rowNumber: number | undefined;
	sheet.eachRow({ includeEmpty: false }, (row) => {
		const key = cellValueToText(row.getCell(1).value).trim();
		if (key.startsWith(prefix)) rowNumber = row.number;
	});
	return rowNumber || findConfigRow(sheet, fallbackKey)?.number;
}

function findHeaderColumn(sheet: Worksheet, header: string) {
	const headerRow = sheet.getRow(1);
	let columnNumber = 0;
	headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
		if (cellValueToText(cell.value).trim() === header) columnNumber = colNumber;
	});
	return columnNumber;
}

function trackRevision(revision: Ref<number>) {
	return revision.value;
}

export type ConfigSheetRow = {
	rowNumber: number;
	values: Record<string, string>;
};

export default createGlobalState(async () => {
	const workbook = shallowRef<Workbook | null>(null);
	const selectedSheetName = ref('');
	const pending = ref(false);
	const isConfigModified = ref(false);
	const revision = ref(0);

	async function loadConfigXlsxFromServer() {
		if (pending.value) return;
		pending.value = true;
		try {
			const buffer = await $fetch<ArrayBuffer>('/input/config.xlsx', {
				responseType: 'arrayBuffer',
			});
			const { default: ExcelJS } = await import('exceljs');
			const wb = new ExcelJS.Workbook();
			await wb.xlsx.load(buffer);
			workbook.value = wb;
			selectedSheetName.value = wb.worksheets[0]?.name || '';
			isConfigModified.value = false;
			revision.value++;
		} catch (error) {
			console.error('Error loading config.xlsx from server:', error);
		} finally {
			pending.value = false;
		}
	}

	const sheetNames = computed(() => {
		trackRevision(revision);
		return workbook.value?.worksheets.map((sheet) => sheet.name) || [];
	});

	const selectedSheet = computed(() => {
		trackRevision(revision);
		if (!workbook.value || !selectedSheetName.value) return undefined;
		return workbook.value.getWorksheet(selectedSheetName.value);
	});

	const selectedSheetRange = computed(() => {
		trackRevision(revision);
		if (!selectedSheet.value) return { columnCount: 1, rowCount: 1 };
		return findUsedRange(selectedSheet.value);
	});

	function readCell(rowNumber: number, columnNumber: number) {
		trackRevision(revision);
		const sheet = selectedSheet.value;
		if (!sheet) return '';
		return cellValueToText(sheet.getRow(rowNumber).getCell(columnNumber).value);
	}

	function writeCell(rowNumber: number, columnNumber: number, value: string) {
		const sheet = selectedSheet.value;
		if (!sheet) return;
		const cell = sheet.getRow(rowNumber).getCell(columnNumber);
		if (!writeCellText(cell, value)) return;
		isConfigModified.value = true;
		revision.value++;
	}

	function readConfigValue(key: string) {
		trackRevision(revision);
		const sheet = workbook.value?.getWorksheet('config');
		if (!sheet) return '';
		const row = findConfigRow(sheet, key);
		if (!row) return '';
		return cellValueToText(row.getCell(2).value);
	}

	function writeConfigValue(key: string, value: string) {
		const sheet = workbook.value?.getWorksheet('config');
		if (!sheet) return;
		const row = findConfigRow(sheet, key);
		if (!row) return;
		const cell = row.getCell(2);
		if (!writeCellText(cell, value)) return;
		isConfigModified.value = true;
		revision.value++;
	}

	function listConfigKeys(prefix: string) {
		trackRevision(revision);
		const sheet = workbook.value?.getWorksheet('config');
		if (!sheet) return [];
		const keys: string[] = [];
		sheet.eachRow({ includeEmpty: false }, (row) => {
			const key = cellValueToText(row.getCell(1).value).trim();
			if (key.startsWith(prefix)) keys.push(key);
		});
		return keys;
	}

	function readSheetRows(sheetName: string) {
		trackRevision(revision);
		const sheet = workbook.value?.getWorksheet(sheetName);
		if (!sheet) return [];
		const { rowCount } = findUsedRange(sheet);
		const headerRow = sheet.getRow(1);
		const headers: string[] = [];
		headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
			headers[colNumber] = cellValueToText(cell.value).trim();
		});
		const rows: ConfigSheetRow[] = [];
		for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
			const row = sheet.getRow(rowNumber);
			const values: Record<string, string> = {};
			let hasValue = false;
			headers.forEach((header, colNumber) => {
				if (!header) return;
				const value = cellValueToText(row.getCell(colNumber).value);
				values[header] = value;
				if (value.trim()) hasValue = true;
			});
			if (hasValue) rows.push({ rowNumber, values });
		}
		return rows;
	}

	function addSheetRow(sheetName: string, values: Record<string, string | number | boolean>) {
		const sheet = workbook.value?.getWorksheet(sheetName);
		if (!sheet) return;
		const { rowCount } = findUsedRange(sheet);
		const headerRow = sheet.getRow(1);
		const rowValues: Array<string | number | boolean | null> = [];
		headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
			const header = cellValueToText(cell.value).trim();
			rowValues[colNumber] = values[header] ?? null;
		});
		sheet.spliceRows(rowCount + 1, 0, rowValues);
		isConfigModified.value = true;
		revision.value++;
	}

	function writeSheetValue(sheetName: string, rowNumber: number, header: string, value: string) {
		const sheet = workbook.value?.getWorksheet(sheetName);
		if (!sheet || rowNumber <= 1) return;
		const columnNumber = findHeaderColumn(sheet, header);
		if (!columnNumber) return;
		const cell = sheet.getRow(rowNumber).getCell(columnNumber);
		if (!writeCellText(cell, value)) return;
		isConfigModified.value = true;
		revision.value++;
	}

	function swapSheetRows(sheetName: string, firstRowNumber: number, secondRowNumber: number) {
		const sheet = workbook.value?.getWorksheet(sheetName);
		if (!sheet || firstRowNumber <= 1 || secondRowNumber <= 1) return;
		const { columnCount } = findUsedRange(sheet);
		const firstRow = sheet.getRow(firstRowNumber);
		const secondRow = sheet.getRow(secondRowNumber);
		const firstValues = Array.from({ length: columnCount }, (_value, index) => {
			return firstRow.getCell(index + 1).value;
		});
		const secondValues = Array.from({ length: columnCount }, (_value, index) => {
			return secondRow.getCell(index + 1).value;
		});
		secondValues.forEach((value, index) => {
			firstRow.getCell(index + 1).value = value;
			secondRow.getCell(index + 1).value = firstValues[index];
		});
		isConfigModified.value = true;
		revision.value++;
	}

	function deleteSheetRow(sheetName: string, rowNumber: number) {
		const sheet = workbook.value?.getWorksheet(sheetName);
		if (!sheet || rowNumber <= 1) return;
		sheet.spliceRows(rowNumber, 1);
		isConfigModified.value = true;
		revision.value++;
	}

	function addConfigValue(
		key: string,
		value = '',
		help = '',
		afterPrefix = '',
		fallbackKey = '',
	) {
		const sheet = workbook.value?.getWorksheet('config');
		if (!sheet || findConfigRow(sheet, key)) return;
		const afterRowNumber = afterPrefix
			? findLastConfigRowNumber(sheet, afterPrefix, fallbackKey)
			: findConfigRow(sheet, fallbackKey)?.number;
		const insertAt = afterRowNumber ? afterRowNumber + 1 : findUsedRange(sheet).rowCount + 1;
		sheet.spliceRows(insertAt, 0, [key, value, help]);
		isConfigModified.value = true;
		revision.value++;
	}

	function deleteConfigValue(key: string) {
		const sheet = workbook.value?.getWorksheet('config');
		if (!sheet) return;
		const row = findConfigRow(sheet, key);
		if (!row) return;
		sheet.spliceRows(row.number, 1);
		isConfigModified.value = true;
		revision.value++;
	}

	async function downloadConfigXlsxFromClient() {
		if (!workbook.value) return;
		const buffer = await workbook.value.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `config-${new Date().toLocaleDateString().replaceAll(/\D/g, '')}.xlsx`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	async function uploadConfigXlsxToServer() {
		if (pending.value || !workbook.value) return false;
		pending.value = true;
		const buffer = await workbook.value.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		});
		const formData = new FormData();
		formData.append('config', blob, 'config.xlsx');
		try {
			await $fetch('/api/config', {
				method: 'POST',
				body: formData,
			});
			isConfigModified.value = false;
			return true;
		} catch (error) {
			console.error('Error uploading config workbook:', error);
			return false;
		} finally {
			pending.value = false;
		}
	}

	const loading = useLoading();
	watch(pending, (newValue) => {
		loading.value = newValue ? 'Konfiguráció betöltése...' : false;
	});

	const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
		event.preventDefault();
		event.returnValue = true;
	};

	watch(isConfigModified, (newValue) => {
		if (newValue) {
			window.addEventListener('beforeunload', beforeUnloadHandler);
		} else {
			window.removeEventListener('beforeunload', beforeUnloadHandler);
		}
	});

	onMounted(async () => {
		if (!workbook.value) await loadConfigXlsxFromServer();
	});

	return {
		addConfigValue,
		addSheetRow,
		deleteConfigValue,
		deleteSheetRow,
		downloadConfigXlsxFromClient,
		isConfigModified: readonly(isConfigModified),
		listConfigKeys,
		loadConfigXlsxFromServer,
		pending: readonly(pending),
		readCell,
		readConfigValue,
		readSheetRows,
		selectedSheet,
		selectedSheetName,
		selectedSheetRange,
		sheetNames,
		swapSheetRows,
		uploadConfigXlsxToServer,
		writeCell,
		writeConfigValue,
		writeSheetValue,
	};
});
