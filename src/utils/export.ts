'use client';

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  let csvContent = '\uFEFF';
  csvContent += headers.join(',') + '\n';

  rows.forEach((row) => {
    const formattedRow = row.map((field) => {
      const stringValue = String(field ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
      }
      return stringValue;
    });
    csvContent += formattedRow.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
