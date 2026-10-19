import React, { useState } from 'react';
import { X, Upload, FileText, Download, CheckCircle2, AlertCircle, Sparkles, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkImportModalProps {
  title: string;
  entityName: string;
  columns: { key: string; label: string; example: string }[];
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: Record<string, string>[]) => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  title,
  entityName,
  columns,
  isOpen,
  onClose,
  onImport,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Generate downloadable Excel (.xlsx) template
  const handleDownloadExcel = () => {
    try {
      const headers = columns.map((c) => c.label);
      const example1 = columns.map((c) => c.example);
      const ws = XLSX.utils.aoa_to_sheet([headers, example1]);
      ws['!cols'] = columns.map(() => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, entityName.slice(0, 31));
      XLSX.writeFile(wb, `template_impor_${entityName.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
    } catch {
      handleDownloadCSV();
    }
  };

  // Generate downloadable CSV template
  const handleDownloadCSV = () => {
    const headers = columns.map((c) => c.label).join(',');
    const example1 = columns.map((c) => c.example).join(',');
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, example1].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `template_impor_${entityName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse text (CSV or Tab-Separated from Excel copy-paste)
  const handleParse = (text: string) => {
    setErrorMsg('');
    if (!text.trim()) {
      setPreviewRows([]);
      return;
    }

    const lines = text
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setPreviewRows([]);
      return;
    }

    // Determine separator: comma or tab or semicolon
    const firstLine = lines[0];
    let sep = ',';
    if (firstLine.includes('\t')) sep = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) sep = ';';

    // Check if first line is header
    let startIndex = 0;
    const lowerFirst = firstLine.toLowerCase();
    const hasHeader = columns.some(
      (c) =>
        lowerFirst.includes(c.label.toLowerCase()) ||
        lowerFirst.includes(c.key.toLowerCase())
    );

    // Map header column indices if header exists
    const colIndexMap: Record<string, number> = {};
    if (hasHeader) {
      startIndex = 1;
      const headerCols = firstLine
        .split(sep)
        .map((val) => val.trim().toLowerCase().replace(/^["']|["']$/g, ''));
      columns.forEach((col) => {
        const targetLabel = col.label.toLowerCase();
        const targetKey = col.key.toLowerCase();
        const foundIdx = headerCols.findIndex(
          (h) => h === targetLabel || h === targetKey || h.includes(targetKey) || targetLabel.includes(h)
        );
        if (foundIdx !== -1) {
          colIndexMap[col.key] = foundIdx;
        }
      });
    }

    const parsed: Record<string, string>[] = [];
    for (let i = startIndex; i < lines.length; i++) {
      const rawCols = lines[i].split(sep).map((val) => val.trim().replace(/^["']|["']$/g, ''));
      if (rawCols.length === 0 || rawCols.every((c) => !c)) continue;

      const rowObj: Record<string, string> = {};
      columns.forEach((col, idx) => {
        const mappedIdx = colIndexMap[col.key] !== undefined ? colIndexMap[col.key] : idx;
        rowObj[col.key] = rawCols[mappedIdx] !== undefined ? rawCols[mappedIdx] : rawCols[idx] || '';
      });
      parsed.push(rowObj);
    }

    if (parsed.length === 0) {
      setErrorMsg('Tidak ada baris data valid yang terbaca. Pastikan format teks sesuai template.');
    } else {
      setPreviewRows(parsed);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet);
          setPasteText(csv);
          handleParse(csv);
        } catch (err: any) {
          setErrorMsg(`Gagal membaca file Excel: ${err?.message || 'Format file tidak valid'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setPasteText(content);
        handleParse(content);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (previewRows.length === 0) {
      setErrorMsg('Belum ada data untuk diimpor. Silakan tempel teks atau unggah file.');
      return;
    }
    onImport(previewRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B1E2E] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base leading-tight">{title}</h3>
              <p className="text-xs text-slate-300">
                Impor massal dari file Excel (.xlsx) / CSV atau salin-tempel langsung dari spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Top Actions: Template & File Upload */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-bold text-slate-800">Format Kolom Template:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {columns.map((c) => (
                  <span
                    key={c.key}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold"
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs transition"
                title="Unduh format spreadsheet Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Template Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg shadow-2xs transition"
                title="Unduh format file CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-600" />
                <span>Template CSV</span>
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold rounded-lg cursor-pointer shadow-2xs transition">
                <FileText className="w-3.5 h-3.5" />
                <span>Pilih File (.xlsx / .csv)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* Paste Input Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Atau Tempel (Copy-Paste) Teks dari Spreadsheet di Sini:
            </label>
            <textarea
              rows={4}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                handleParse(e.target.value);
              }}
              placeholder={`Salin baris dari Excel atau ketik baris data dipisahkan koma atau tab...\nContoh:\n${columns.map((c) => c.example).join('\t')}`}
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none bg-slate-50"
            />
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pratinjau {previewRows.length} Baris Data Terbaca:
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Siap disimpan</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="p-2 text-center">NO</th>
                      {columns.map((c) => (
                        <th key={c.key} className="p-2">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        {columns.map((c) => (
                          <td key={c.key} className="p-2 text-slate-800 font-medium truncate max-w-xs">
                            {row[c.key] || <span className="text-slate-300 italic">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={previewRows.length === 0}
            onClick={handleConfirmImport}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Simpan ({previewRows.length}) Data ke Sistem</span>
          </button>
        </div>
      </div>
    </div>
  );
};
