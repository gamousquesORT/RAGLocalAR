export interface CsvRow {
  category_name_es: string;
  category_name: string;
  description: string;
}

export interface IndexingResult {
  indexed: number;
  errors: string[];
}
