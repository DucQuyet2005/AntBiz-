import type {
  CaptionCsvSerializer,
  CaptionExportRow,
  ExportRelation,
} from './caption-export-types';

const CSV_HEADERS = [
  'ID',
  'Article URL',
  'Article Title',
  'Category',
  'Platform',
  'Prompt Name',
  'Prompt Content',
  'AI Content',
  'Edited Content',
  'Status',
  'Created By',
  'Created At',
];

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export class SafeCaptionCsvSerializer implements CaptionCsvSerializer {
  serialize(rows: CaptionExportRow[]) {
    const body = rows.map((row) => {
      const article = relation(row.articles);
      const prompt = relation(row.prompts);
      const user = relation(row.users);
      return [
        row.id,
        article?.url,
        article?.title,
        article?.category,
        row.platform,
        prompt?.name,
        prompt?.content,
        row.ai_content,
        row.edited_content,
        row.status,
        user?.email,
        row.created_at,
      ].map(csvCell).join(',');
    });

    return `\ufeff${[CSV_HEADERS.join(','), ...body].join('\n')}`;
  }
}

function csvCell(value: unknown) {
  let text = value === undefined || value === null ? '' : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function relation(value: ExportRelation | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
