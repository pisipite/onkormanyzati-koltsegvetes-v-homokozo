import type { CellValue, Workbook } from 'exceljs';

export type ConfigJson = Record<string, unknown>;

function configCellValueToJsonValue(rawValue: CellValue): unknown {
	let value = rawValue || '';
	if (typeof value === 'object') {
		if ('text' in value) value = value.text;
		else if ('richText' in value) {
			value = value.richText.map((part) => part.text).join('');
		}
	}
	return value;
}

export function parseConfigWorkbook(workbook: Workbook) {
	const configJson: ConfigJson = {};
	const sheet = workbook.getWorksheet('config');

	sheet?.eachRow((row, rowNumber) => {
		if (rowNumber === 1) return;
		const fullKey = String(row.getCell(1).value || '');
		if (!fullKey) return;

		const keyParts = fullKey.split('.');
		let target = configJson;
		for (let i = 0; i < keyParts.length - 1; i++) {
			const keyPart = keyParts[i]!;
			target[keyPart] = target[keyPart] || {};
			target = target[keyPart] as ConfigJson;
		}
		target[keyParts[keyParts.length - 1]!] = configCellValueToJsonValue(row.getCell(2).value);
	});

	const kgrSheet = workbook.getWorksheet('kgr');
	if (kgrSheet) {
		const kgrIds: string[] = [];
		kgrSheet.eachRow((row, rowNumber) => {
			if (rowNumber === 1) return;
			const id = String(row.getCell(1).value || '').trim();
			if (!id) return;
			kgrIds.push(id);
		});
		if (kgrIds.length > 0) {
			configJson.timeseries = configJson.timeseries || {};
			(configJson.timeseries as ConfigJson).kgr = kgrIds.join(',');
		}
	}

	return configJson;
}

export function readConfigPath(configJson: ConfigJson, path: string) {
	return path.split('.').reduce<unknown>((target, keyPart) => {
		if (!target || typeof target !== 'object') return undefined;
		return (target as ConfigJson)[keyPart];
	}, configJson);
}

export function flattenConfig(configJson: ConfigJson, prefix = '') {
	const flattened: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(configJson)) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (
			value &&
			typeof value === 'object' &&
			!(value instanceof Date) &&
			!Array.isArray(value) &&
			!('formula' in value) &&
			!('text' in value) &&
			!('richText' in value)
		) {
			Object.assign(flattened, flattenConfig(value as ConfigJson, fullKey));
		} else {
			flattened[fullKey] = value;
		}
	}
	return flattened;
}
