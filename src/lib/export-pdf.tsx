import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

export type PdfExportColumn = {
  key: string;
  label: string;
  widthPercent?: number;
};

type RenderSimpleTablePdfInput = {
  title: string;
  subtitle?: string;
  columns: PdfExportColumn[];
  rows: Array<Record<string, unknown>>;
  generatedAt?: Date;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    fontSize: 9,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 12,
    color: "#475569",
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
  },
  headerCell: {
    backgroundColor: "#f1f5f9",
    fontWeight: 700,
  },
  cell: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    borderRightStyle: "solid",
  },
  footer: {
    marginTop: 10,
    fontSize: 8,
    color: "#64748b",
  },
});

const toSafeText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
};

function SimpleTableDocument({
  title,
  subtitle,
  columns,
  rows,
  generatedAt,
}: RenderSimpleTablePdfInput) {
  const fallbackWidth = 100 / Math.max(columns.length, 1);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={styles.table}>
          <View style={styles.row}>
            {columns.map((column, index) => {
              const widthPercent = column.widthPercent ?? fallbackWidth;

              return (
                <View
                  key={`header-${column.key}`}
                  style={[
                    styles.cell,
                    styles.headerCell,
                    { width: `${widthPercent}%` },
                    index === columns.length - 1 ? { borderRightWidth: 0 } : {},
                  ]}
                >
                  <Text>{column.label}</Text>
                </View>
              );
            })}
          </View>

          {rows.length === 0 ? (
            <View style={styles.row}>
              <View style={[styles.cell, { width: "100%", borderRightWidth: 0 }]}>
                <Text>Sin datos para exportar.</Text>
              </View>
            </View>
          ) : (
            rows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.row}>
                {columns.map((column, index) => {
                  const widthPercent = column.widthPercent ?? fallbackWidth;

                  return (
                    <View
                      key={`cell-${rowIndex}-${column.key}`}
                      style={[
                        styles.cell,
                        { width: `${widthPercent}%` },
                        index === columns.length - 1 ? { borderRightWidth: 0 } : {},
                      ]}
                    >
                      <Text>{toSafeText(row[column.key])}</Text>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          Generado: {(generatedAt ?? new Date()).toISOString()}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderSimpleTablePdf(input: RenderSimpleTablePdfInput): Promise<Buffer> {
  return renderToBuffer(<SimpleTableDocument {...input} />);
}
