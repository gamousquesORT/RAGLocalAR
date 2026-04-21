import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { CsvRow } from './indexing.types';

export function parseCsv(csvContent: string): CsvRow[] {
  if (!csvContent.trim()) return [];

  const rows = parse(csvContent, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const normalizedRows: CsvRow[] = [];

  for (const row of rows) {
    const description = row.description ?? row.descripcion;

    if (!description) {
      throw new Error(`CSV row missing required 'description' (or 'descripcion') field: ${JSON.stringify(row)}`);
    }
    if (!row.category_name_es) {
      throw new Error(`CSV row missing required 'category_name_es' field: ${JSON.stringify(row)}`);
    }

    normalizedRows.push({
      description,
      category_name_es: row.category_name_es,
    });
  }

  return normalizedRows;
}

export function loadCsvFromFile(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseCsv(content);
}
