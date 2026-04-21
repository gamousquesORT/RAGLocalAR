export interface CsvRow {
  category_name_es: string;
  description: string;
}

export interface IndexingResult {
  indexed: number;
  errors: string[];
}
