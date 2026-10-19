import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Building2,
  Users,
  BookOpen,
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileText,
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Teacher, Subject, SchoolClass, Room, ScheduleItem, ScheduleWeekType } from '../../types';

interface ScheduleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  rooms: Room[];
  teachers: Teacher[];
  subjects: Subject[];
  onImport: (
    newSchedules: ScheduleItem[],
    newTeachers: Teacher[],
    newSubjects: Subject[],
    newRooms: Room[],
    targetClassId: string
  ) => void;
}

export const DEFAULT_SAMPLE_SCHEDULE = `HARI ;JAM ;PUKUL;MAPEL ;KODE GURU;RUANG
SENIN;1;06.45 - 07.20;UPACARA;;
;2;07.20 - 07.55;BAHASA INGGRIS ;BIG3;R.J1
;3;07.55 - 08.30;BAHASA INGGRIS ;BIG3;R.J1
;4;08.30 - 09.05;BAHASA INGGRIS ;BIG3;R.J1
;;09.05 - 09.40;ISTIRAHAT;;
;5;09.40 - 10.15 ;PENDIDIKAN PANCASILA;KN3;R.J1
;6;10.15 - 10.50;PENDIDIKAN PANCASILA;KN3;R.J1
;7;10.50 - 11.25 ;PENDIDIKAN PANCASILA;KN3;R.J1
;;11.25 - 12.25;ISTIRAHAT;;
;8;12.25 - 13.00;PENDIDIKAN PANCASILA;KN3;R.J1
;9;13.00 - 13.35 ;MATEMATIKA;MT7;R.J1
;10;13.35 - 14.10;MATEMATIKA;MT7;R.J1
;11;14.10 - 14.45;MATEMATIKA;MT7;R.J1
;;;;;
SELASA;1;06.45 - 07.20;PEND. AGAMA & BUDI PEKERTI;PAI1;R.J1
;2;07.20 - 07.55;PEND. AGAMA & BUDI PEKERTI;PAI1;R.J1
;3;07.55 - 08.30;BAHASA INDONESIA;BIN7;R.J1
;4;08.30 - 09.05;BAHASA INDONESIA;BIN7;R.J1
;;09.05 - 09.40;ISTIRAHAT;;
;5;09.40 - 10.15 ;BAHASA INDONESIA;BIN7;R.J1
;6;10.15 - 10.50;BAHASA INDONESIA;BIN7;R.J1
;7;10.50 - 11.25 ;SEJARAH INDONESIA;SJ1;R.J1
;;11.25 - 12.25;ISTIRAHAT;;
;8;12.25 - 13.00;SEJARAH INDONESIA;SJ1;R.J1
;9;13.00 - 13.35 ;MATEMATIKA;MT7;R.J1
;10;13.35 - 14.10;MATEMATIKA;MT7;R.J1
;11;14.10 - 14.45;MATEMATIKA;MT7;R.J1
;;;;;
RABU;1;06.45 - 07.20;SENI BUDAYA;SB2;R.J1
;2;07.20 - 07.55;SENI BUDAYA;SB2;R.J1
;3;07.55 - 08.30;SENI BUDAYA;SB2;R.J1
;4;08.30 - 09.05;SENI BUDAYA;SB2;R.J1
;;09.05 - 09.40;ISTIRAHAT;;
;5;09.40 - 10.15 ;BAHASA INDONESIA;BIN7;R.J1
;6;10.15 - 10.50;BAHASA INDONESIA;BIN7;R.J1
;7;10.50 - 11.25 ;BAHASA INDONESIA;BIN7;R.J1
;;11.25 - 12.25;ISTIRAHAT;;
;8;12.25 - 13.00;BAHASA INDONESIA;BIN7;R.J1
;9;13.00 - 13.35 ;BAHASA INGGRIS ;BIG3;R.J1
;10;13.35 - 14.10;BAHASA INGGRIS ;BIG3;R.J1
;11;14.10 - 14.45;BAHASA INGGRIS ;BIG3;R.J1
;;;;;
KAMIS;1;06.45 - 07.20;PEND. AGAMA & BUDI PEKERTI;PAI1;R.J1
;2;07.20 - 07.55;PEND. AGAMA & BUDI PEKERTI;PAI1;R.J1
;3;07.55 - 08.30;PEND. AGAMA & BUDI PEKERTI;PAI1;R.J1
;4;08.30 - 09.05;PEND. AGAMA & BUDI PEKERTI;PAI1;R.J1
;;09.05 - 09.40;ISTIRAHAT;;
;5;09.40 - 10.15 ;BIMBINGAN KONSELING ;BK6;R.J1
;6;10.15 - 10.50;DINIYAH ;DIN;R.J1
;7;10.50 - 11.25 ;DINIYAH ;DIN;R.J1
;;11.25 - 12.25;ISTIRAHAT;;
;8;12.25 - 13.00;BAHASA JAWA;BJ6;R.J1
;9;13.00 - 13.35 ;BAHASA JAWA;BJ6;R.J1
;10;13.35 - 14.10;PJOK;OR3;R.J1
;11;14.10 - 14.45;PJOK;OR3;R.J1
;;;;;
;;06.45-07.30;ISTIGOSAH;;
JUMAT;1;07.30 - 08.00;PJOK;OR3;LAPANGAN
;2;08.00 - 08.30;PJOK;OR3;LAPANGAN
;3;08.30 - 09.00;PJOK;OR3;LAPANGAN
;;09.00 - 09.30;ISTIRAHAT;;
;4;09.30 - 10.00;PJOK;OR3;LAPANGAN
;5;10.00 - 10.30;BIMBINGAN KONSELING ;BK6;R.J1
;EKS;12.30 - 14.45;EKSTRAKURIKULER;;`;

export const ScheduleImportModal: React.FC<ScheduleImportModalProps> = ({
  isOpen,
  onClose,
  classes,
  rooms,
  teachers,
  subjects,
  onImport,
}) => {
  // Method tab: 'file' (Excel/CSV upload) or 'text' (manual paste)
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');

  const [targetClassId, setTargetClassId] = useState(classes[0]?.id || 'cl-1');
  const [targetWeekType, setTargetWeekType] = useState<ScheduleWeekType>('P10_PROD_P11_NORM');
  const [inputText, setInputText] = useState(DEFAULT_SAMPLE_SCHEDULE);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Parsed State
  const [parsedItems, setParsedItems] = useState<ScheduleItem[]>([]);
  const [newTeachersToAdd, setNewTeachersToAdd] = useState<Teacher[]>([]);
  const [newSubjectsToAdd, setNewSubjectsToAdd] = useState<Subject[]>([]);
  const [newRoomsToAdd, setNewRoomsToAdd] = useState<Room[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetClassObj = classes.find((c) => c.id === targetClassId) || classes[0];

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'file' && workbookRef && selectedSheet) {
        parseWorkbookSheet(workbookRef, selectedSheet);
      } else if (activeTab === 'text') {
        parseScheduleText(inputText);
      }
    }
  }, [isOpen, targetClassId, targetWeekType]);

  if (!isOpen) return null;

  const dayMap: Record<string, number> = {
    SENIN: 1,
    SELASA: 2,
    RABU: 3,
    KAMIS: 4,
    JUMAT: 5,
  };

  /**
   * Core parsing row by row into schedules and synchronizing with teachers and rooms
   */
  const processRawRows = (
    rows: Array<{
      day: string;
      jam: string;
      pukul: string;
      mapel: string;
      guruCode: string;
      ruang: string;
    }>
  ) => {
    setErrorMsg('');
    let currentDay = 'SENIN';
    const schedulesList: ScheduleItem[] = [];
    const generatedTeachers: Record<string, Teacher> = {};
    const generatedSubjects: Record<string, Subject> = {};
    const generatedRooms: Record<string, Room> = {};

    let indexCount = 1;

    for (const r of rows) {
      const dayCol = (r.day || '').trim().toUpperCase();
      const jamCol = (r.jam || '').trim();
      const pukulCol = (r.pukul || '').trim();
      const mapelCol = (r.mapel || '').trim();
      const guruCodeCol = (r.guruCode || '').trim();
      const ruangCol = (r.ruang || '').trim();

      // If day is specified, update current active day
      if (dayCol && dayMap[dayCol]) {
        currentDay = dayCol;
      }

      // Ignore pure separators or empty rows
      if (!jamCol && !mapelCol && !pukulCol) continue;

      // Ignore break / istirahat rows
      const isBreak =
        mapelCol.toUpperCase().includes('ISTIRAHAT') ||
        pukulCol.toUpperCase().includes('ISTIRAHAT');
      if (isBreak) continue;

      // Normalize period index
      let periodIdx: number | string = jamCol;
      const numVal = parseInt(jamCol, 10);
      if (!isNaN(numVal)) {
        periodIdx = numVal;
      } else if (!jamCol) {
        periodIdx = mapelCol || 'KBM';
      }

      // Time range formatting
      const timeRange = pukulCol.replace(/\./g, ':') || '07:00 - 07:45';
      const timeParts = timeRange.split('-').map((t) => t.trim().replace(/\./g, ':'));
      const startTime = timeParts[0] || '07:00';
      const endTime = timeParts[1] || '07:45';

      // 1. SINKRONISASI DATA GURU (Berdasarkan Kode Guru)
      let matchedTeacher = teachers.find(
        (t) =>
          (guruCodeCol && t.code.toUpperCase() === guruCodeCol.toUpperCase()) ||
          (guruCodeCol && t.name.toUpperCase().includes(guruCodeCol.toUpperCase()))
      );

      if (!matchedTeacher && guruCodeCol) {
        const codeKey = guruCodeCol.toUpperCase();
        if (!generatedTeachers[codeKey]) {
          const autoTeacher: Teacher = {
            id: `t-auto-${codeKey.toLowerCase()}`,
            code: codeKey,
            nip: '-',
            name: `Guru Pengajar (${codeKey})`,
            title: `Guru ${mapelCol || 'Mata Pelajaran'}`,
            department: targetClassObj?.department || 'TKJ',
            email: `${codeKey.toLowerCase()}@smkn1tegalsari.sch.id`,
            phone: '081234567890',
            isPiketToday: false,
          };
          generatedTeachers[codeKey] = autoTeacher;
        }
        matchedTeacher = generatedTeachers[codeKey];
      }

      // 2. SINKRONISASI DATA MATA PELAJARAN
      const cleanSubjectName = mapelCol || 'Mata Pelajaran';
      let matchedSubject = subjects.find(
        (s) =>
          s.name.toUpperCase() === cleanSubjectName.toUpperCase() ||
          s.code.toUpperCase() === cleanSubjectName.toUpperCase()
      );

      if (!matchedSubject && cleanSubjectName) {
        const subKey = cleanSubjectName.toUpperCase();
        if (!generatedSubjects[subKey]) {
          const autoSub: Subject = {
            id: `sb-auto-${Date.now()}-${Object.keys(generatedSubjects).length + 1}`,
            code: guruCodeCol
              ? `M-${guruCodeCol.toUpperCase()}`
              : cleanSubjectName.slice(0, 8).toUpperCase().replace(/\s+/g, '-'),
            name: cleanSubjectName,
            category:
              cleanSubjectName.toUpperCase().includes('MKK') ||
              cleanSubjectName.toUpperCase().includes('PRAKTIK') ||
              cleanSubjectName.toUpperCase().includes('PRODUKTIF')
                ? 'Produktif'
                : cleanSubjectName.toUpperCase().includes('DINIYAH') ||
                  cleanSubjectName.toUpperCase().includes('JAWA') ||
                  cleanSubjectName.toUpperCase().includes('MULOK') ||
                  cleanSubjectName.toUpperCase().includes('MUATAN LOKAL')
                ? 'Muatan Lokal'
                : 'Umum',
            jp: 2,
            department: targetClassObj?.department || 'UMUM',
          };
          generatedSubjects[subKey] = autoSub;
        }
        matchedSubject = generatedSubjects[subKey];
      }

      // 3. SINKRONISASI DATA RUANGAN (Berdasarkan Kolom RUANG pada data Excel)
      const cleanRuang = ruangCol;
      let matchedRoom: Room | undefined = undefined;

      if (cleanRuang) {
        const rKey = cleanRuang.toUpperCase();
        matchedRoom = rooms.find(
          (r) =>
            r.code.toUpperCase() === rKey ||
            r.name.toUpperCase() === rKey ||
            r.code.replace(/[^A-Z0-9]/g, '') === rKey.replace(/[^A-Z0-9]/g, '') ||
            r.name.toUpperCase().includes(rKey)
        );

        if (!matchedRoom) {
          if (!generatedRooms[rKey]) {
            const isLap = rKey.includes('LAPANGAN');
            const isLab = rKey.includes('LAB');
            const isBengkel = rKey.includes('BENGKEL');
            const formattedName = rKey.startsWith('R.') ? `RUANG ${rKey.slice(2)}` : rKey;

            const autoRoom: Room = {
              id: `rm-auto-${rKey.replace(/[^A-Z0-9]/g, '') || Date.now()}`,
              code: rKey,
              name: formattedName,
              building: isLap
                ? 'Area Terbuka / Olahraga'
                : rKey.startsWith('R.J')
                ? 'Gedung J'
                : 'Gedung Teori',
              type: isBengkel ? 'Bengkel Praktik' : isLab ? 'Lab Komputer' : 'Teori',
            };
            generatedRooms[rKey] = autoRoom;
          }
          matchedRoom = generatedRooms[rKey];
        }
      } else {
        const isUpacaraOrEks =
          cleanSubjectName.toUpperCase().includes('UPACARA') ||
          cleanSubjectName.toUpperCase().includes('EKSTRA');
        const defaultName = isUpacaraOrEks ? 'LAPANGAN UTAMA' : 'RUANG TEORI';
        matchedRoom = rooms.find((r) => r.name.toUpperCase().includes(defaultName)) || {
          id: 'rm-default',
          code: isUpacaraOrEks ? 'LAPANGAN' : 'R-TEORI',
          name: defaultName,
          building: isUpacaraOrEks ? 'Area Terbuka' : 'Gedung Teori',
          type: 'Teori',
        };
      }

      const scheduleItem: ScheduleItem = {
        id: `sc-imp-${Date.now()}-${indexCount++}`,
        dayOfWeek: dayMap[currentDay] || 1,
        dayName: currentDay,
        periodIndex: periodIdx,
        timeRange,
        startTime,
        endTime,
        teacherId: matchedTeacher ? matchedTeacher.id : 't-none',
        teacherName: matchedTeacher
          ? matchedTeacher.name
          : guruCodeCol
          ? `Guru (${guruCodeCol})`
          : 'Guru Pembina / Wali Kelas',
        teacherCode: guruCodeCol || undefined,
        subjectCode: matchedSubject ? matchedSubject.code : 'MPL',
        subjectName: cleanSubjectName,
        classId: targetClassObj?.id || 'cl-1',
        className: targetClassObj?.name || 'Kelas',
        department: targetClassObj?.department || 'TKJ',
        roomName: matchedRoom ? matchedRoom.name : 'RUANG TEORI',
        roomType: matchedRoom ? matchedRoom.type : 'Teori',
        weekType: targetWeekType,
      };

      schedulesList.push(scheduleItem);
    }

    if (schedulesList.length === 0) {
      setErrorMsg(
        'Tidak ada baris jadwal yang valid. Pastikan format kolom: HARI, JAM, PUKUL, MAPEL, KODE GURU, RUANG.'
      );
      setParsedItems([]);
      setNewTeachersToAdd([]);
      setNewSubjectsToAdd([]);
      setNewRoomsToAdd([]);
    } else {
      setParsedItems(schedulesList);
      setNewTeachersToAdd(Object.values(generatedTeachers));
      setNewSubjectsToAdd(Object.values(generatedSubjects));
      setNewRoomsToAdd(Object.values(generatedRooms));
    }
  };

  /**
   * Parse Sheet from Excel Workbook
   */
  const parseWorkbookSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) {
        setErrorMsg(`Sheet "${sheetName}" tidak ditemukan.`);
        return;
      }

      // Convert sheet to array of rows
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      if (!rawData || rawData.length === 0) {
        setErrorMsg(`Sheet "${sheetName}" kosong.`);
        setParsedItems([]);
        return;
      }

      // Identify header row index
      let headerIdx = -1;
      let colMap = {
        hari: 0,
        jam: 1,
        pukul: 2,
        mapel: 3,
        guru: 4,
        ruang: 5,
      };

      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const row = rawData[i];
        if (!Array.isArray(row)) continue;
        const stringRow = row.map((cell) => String(cell || '').trim().toUpperCase());

        const hasHari = stringRow.some((c) => c === 'HARI');
        const hasMapel = stringRow.some((c) => c.includes('MAPEL') || c.includes('PELAJARAN'));

        if (hasHari && hasMapel) {
          headerIdx = i;
          // Map column indices
          stringRow.forEach((c, idx) => {
            if (c === 'HARI') colMap.hari = idx;
            else if (c.includes('JAM') && !c.includes('PELAJARAN')) colMap.jam = idx;
            else if (c.includes('PUKUL') || c.includes('WAKTU')) colMap.pukul = idx;
            else if (c.includes('MAPEL') || c.includes('PELAJARAN')) colMap.mapel = idx;
            else if (c.includes('KODE') || c.includes('GURU')) colMap.guru = idx;
            else if (c.includes('RUANG') || c.includes('TEMPAT') || c.includes('LOKASI'))
              colMap.ruang = idx;
          });
          break;
        }
      }

      const rowsToProcess: Array<{
        day: string;
        jam: string;
        pukul: string;
        mapel: string;
        guruCode: string;
        ruang: string;
      }> = [];

      const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
      for (let i = startIdx; i < rawData.length; i++) {
        const row = rawData[i];
        if (!Array.isArray(row)) continue;

        const dayVal = String(row[colMap.hari] || '').trim();
        const jamVal = String(row[colMap.jam] || '').trim();
        const pukulVal = String(row[colMap.pukul] || '').trim();
        const mapelVal = String(row[colMap.mapel] || '').trim();
        const guruVal = String(row[colMap.guru] || '').trim();
        const ruangVal = String(row[colMap.ruang] || '').trim();

        // Skip completely empty row
        if (!dayVal && !jamVal && !pukulVal && !mapelVal && !guruVal && !ruangVal) {
          continue;
        }

        rowsToProcess.push({
          day: dayVal,
          jam: jamVal,
          pukul: pukulVal,
          mapel: mapelVal,
          guruCode: guruVal,
          ruang: ruangVal,
        });
      }

      processRawRows(rowsToProcess);
      setSuccessInfo(
        `File Excel berhasil dibaca dari sheet "${sheetName}". Ditemukan ${rowsToProcess.length} baris data.`
      );
    } catch (err: any) {
      setErrorMsg(`Gagal memproses file Excel: ${err?.message || 'Format tidak valid'}`);
    }
  };

  /**
   * Handle File Upload (Excel .xlsx, .xls, .csv, .txt)
   */
  const handleFileUpload = (file: File) => {
    setSelectedFile(file);
    setErrorMsg('');
    setSuccessInfo('');
    setIsProcessingFile(true);

    const reader = new FileReader();

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      reader.onload = (e) => {
        setIsProcessingFile(false);
        const text = e.target?.result as string;
        if (text) {
          setInputText(text);
          parseScheduleText(text);
          setSuccessInfo(`File "${file.name}" berhasil diunggah.`);
        }
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      // Excel binary (.xlsx, .xls)
      reader.onload = (e) => {
        setIsProcessingFile(false);
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          setWorkbookRef(wb);

          if (wb.SheetNames.length === 0) {
            setErrorMsg('Workbook Excel tidak memiliki sheet.');
            return;
          }

          setSheetNames(wb.SheetNames);
          const firstSheet = wb.SheetNames[0];
          setSelectedSheet(firstSheet);
          parseWorkbookSheet(wb, firstSheet);
        } catch (err: any) {
          setErrorMsg(`Gagal membaca file Excel: ${err?.message || 'Pastikan file tidak rusak'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  /**
   * Parse Schedule from Semicolon / Comma / Tab Separated Text
   */
  const parseScheduleText = (text: string) => {
    setErrorMsg('');
    setSuccessInfo('');
    if (!text.trim()) {
      setParsedItems([]);
      setNewTeachersToAdd([]);
      setNewSubjectsToAdd([]);
      setNewRoomsToAdd([]);
      return;
    }

    const lines = text.split('\n');
    const rowsToProcess: Array<{
      day: string;
      jam: string;
      pukul: string;
      mapel: string;
      guruCode: string;
      ruang: string;
    }> = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let sep = ';';
      if (line.includes(';') && !line.includes('\t')) sep = ';';
      else if (line.includes('\t')) sep = '\t';
      else if (line.includes(',')) sep = ',';

      const parts = line.split(sep).map((p) => p.trim());
      if (parts.length < 3) continue;

      if (
        parts[0].toUpperCase() === 'HARI' &&
        (parts[1]?.toUpperCase().includes('JAM') || parts[3]?.toUpperCase().includes('MAPEL'))
      ) {
        continue;
      }

      rowsToProcess.push({
        day: parts[0] || '',
        jam: parts[1] || '',
        pukul: parts[2] || '',
        mapel: parts[3] || '',
        guruCode: parts[4] || '',
        ruang: parts[5] || '',
      });
    }

    processRawRows(rowsToProcess);
  };

  /**
   * Generate & Download Official Excel Template
   */
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        ['HARI', 'JAM', 'PUKUL', 'MAPEL', 'KODE GURU', 'RUANG'],
        ['SENIN', 1, '06.45 - 07.20', 'UPACARA', '', ''],
        ['', 2, '07.20 - 07.55', 'BAHASA INGGRIS', 'BIG3', 'R.J1'],
        ['', 3, '07.55 - 08.30', 'BAHASA INGGRIS', 'BIG3', 'R.J1'],
        ['', 4, '08.30 - 09.05', 'BAHASA INGGRIS', 'BIG3', 'R.J1'],
        ['', '', '09.05 - 09.40', 'ISTIRAHAT', '', ''],
        ['', 5, '09.40 - 10.15', 'PENDIDIKAN PANCASILA', 'KN3', 'R.J1'],
        ['', 6, '10.15 - 10.50', 'PENDIDIKAN PANCASILA', 'KN3', 'R.J1'],
        ['', 7, '10.50 - 11.25', 'PENDIDIKAN PANCASILA', 'KN3', 'R.J1'],
        ['', '', '11.25 - 12.25', 'ISTIRAHAT', '', ''],
        ['', 8, '12.25 - 13.00', 'PENDIDIKAN PANCASILA', 'KN3', 'R.J1'],
        ['', 9, '13.00 - 13.35', 'MATEMATIKA', 'MT7', 'R.J1'],
        ['', 10, '13.35 - 14.10', 'MATEMATIKA', 'MT7', 'R.J1'],
        ['', 11, '14.10 - 14.45', 'MATEMATIKA', 'MT7', 'R.J1'],
        ['', '', '', '', '', ''],
        ['SELASA', 1, '06.45 - 07.20', 'PEND. AGAMA & BUDI PEKERTI', 'PAI1', 'R.J1'],
        ['', 2, '07.20 - 07.55', 'PEND. AGAMA & BUDI PEKERTI', 'PAI1', 'R.J1'],
        ['', 3, '07.55 - 08.30', 'BAHASA INDONESIA', 'BIN7', 'R.J1'],
        ['', 4, '08.30 - 09.05', 'BAHASA INDONESIA', 'BIN7', 'R.J1'],
        ['', '', '09.05 - 09.40', 'ISTIRAHAT', '', ''],
        ['', 5, '09.40 - 10.15', 'BAHASA INDONESIA', 'BIN7', 'R.J1'],
        ['', 6, '10.15 - 10.50', 'BAHASA INDONESIA', 'BIN7', 'R.J1'],
        ['', 7, '10.50 - 11.25', 'SEJARAH INDONESIA', 'SJ1', 'R.J1'],
        ['', '', '11.25 - 12.25', 'ISTIRAHAT', '', ''],
        ['', 8, '12.25 - 13.00', 'SEJARAH INDONESIA', 'SJ1', 'R.J1'],
        ['', 9, '13.00 - 13.35', 'MATEMATIKA', 'MT7', 'R.J1'],
        ['', 10, '13.35 - 14.10', 'MATEMATIKA', 'MT7', 'R.J1'],
        ['', 11, '14.10 - 14.45', 'MATEMATIKA', 'MT7', 'R.J1'],
        ['', '', '', '', '', ''],
        ['RABU', 1, '06.45 - 07.20', 'SENI BUDAYA', 'SB2', 'R.J1'],
        ['', 2, '07.20 - 07.55', 'SENI BUDAYA', 'SB2', 'R.J1'],
        ['', 3, '07.55 - 08.30', 'SENI BUDAYA', 'SB2', 'R.J1'],
        ['', 4, '08.30 - 09.05', 'SENI BUDAYA', 'SB2', 'R.J1'],
        ['', '', '09.05 - 09.40', 'ISTIRAHAT', '', ''],
        ['', 5, '09.40 - 10.15', 'BAHASA INDONESIA', 'BIN7', 'R.J1'],
        ['', 6, '10.15 - 10.50', 'BAHASA INDONESIA', 'BIN7', 'R.J1'],
        ['', 7, '10.50 - 11.25', 'BAHASA INDONESIA', 'BIN7', 'R.J1'],
        ['', '', '11.25 - 12.25', 'ISTIRAHAT', '', ''],
        ['', 8, '12.25 - 13.00', 'BAHASA INDONESIA', 'BIN7', 'R.J1'],
        ['', 9, '13.00 - 13.35', 'BAHASA INGGRIS', 'BIG3', 'R.J1'],
        ['', 10, '13.35 - 14.10', 'BAHASA INGGRIS', 'BIG3', 'R.J1'],
        ['', 11, '14.10 - 14.45', 'BAHASA INGGRIS', 'BIG3', 'R.J1'],
        ['', '', '', '', '', ''],
        ['KAMIS', 1, '06.45 - 07.20', 'PEND. AGAMA & BUDI PEKERTI', 'PAI1', 'R.J1'],
        ['', 2, '07.20 - 07.55', 'PEND. AGAMA & BUDI PEKERTI', 'PAI1', 'R.J1'],
        ['', 3, '07.55 - 08.30', 'PEND. AGAMA & BUDI PEKERTI', 'PAI1', 'R.J1'],
        ['', 4, '08.30 - 09.05', 'PEND. AGAMA & BUDI PEKERTI', 'PAI1', 'R.J1'],
        ['', '', '09.05 - 09.40', 'ISTIRAHAT', '', ''],
        ['', 5, '09.40 - 10.15', 'BIMBINGAN KONSELING', 'BK6', 'R.J1'],
        ['', 6, '10.15 - 10.50', 'DINIYAH', 'DIN', 'R.J1'],
        ['', 7, '10.50 - 11.25', 'DINIYAH', 'DIN', 'R.J1'],
        ['', '', '11.25 - 12.25', 'ISTIRAHAT', '', ''],
        ['', 8, '12.25 - 13.00', 'BAHASA JAWA', 'BJ6', 'R.J1'],
        ['', 9, '13.00 - 13.35', 'BAHASA JAWA', 'BJ6', 'R.J1'],
        ['', 10, '13.35 - 14.10', 'PJOK', 'OR3', 'R.J1'],
        ['', 11, '14.10 - 14.45', 'PJOK', 'OR3', 'R.J1'],
        ['', '', '', '', '', ''],
        ['JUMAT', 1, '07.30 - 08.00', 'PJOK', 'OR3', 'LAPANGAN'],
        ['', 2, '08.00 - 08.30', 'PJOK', 'OR3', 'LAPANGAN'],
        ['', 3, '08.30 - 09.00', 'PJOK', 'OR3', 'LAPANGAN'],
        ['', '', '09.00 - 09.30', 'ISTIRAHAT', '', ''],
        ['', 4, '09.30 - 10.00', 'PJOK', 'OR3', 'LAPANGAN'],
        ['', 5, '10.00 - 10.30', 'BIMBINGAN KONSELING', 'BK6', 'R.J1'],
        ['', 'EKS', '12.30 - 14.45', 'EKSTRAKURIKULER', '', 'LAPANGAN UTAMA'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);
      // Auto column widths
      ws['!cols'] = [
        { wch: 12 }, // HARI
        { wch: 8 },  // JAM
        { wch: 18 }, // PUKUL
        { wch: 30 }, // MAPEL
        { wch: 14 }, // KODE GURU
        { wch: 16 }, // RUANG
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Format_Jadwal');
      XLSX.writeFile(wb, 'Format_Jadwal_SMKN1_Tegalsari.xlsx');
    } catch (err: any) {
      setErrorMsg(`Gagal mengunduh template: ${err?.message || 'Error'}`);
    }
  };

  const handleApply = () => {
    if (parsedItems.length === 0) {
      if (activeTab === 'file' && workbookRef && selectedSheet) {
        parseWorkbookSheet(workbookRef, selectedSheet);
      } else {
        parseScheduleText(inputText);
      }
    }

    if (parsedItems.length === 0) {
      setErrorMsg('Silakan pilih file Excel yang sesuai dengan format sebelum menerapkan jadwal.');
      return;
    }

    onImport(parsedItems, newTeachersToAdd, newSubjectsToAdd, newRoomsToAdd, targetClassId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B1E2E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Impor File Jadwal Pelajaran (Per Kelas)
              </h3>
              <p className="text-xs text-slate-300">
                Format SMKN 1 Tegalsari • Kolom: HARI, JAM, PUKUL, MAPEL, KODE GURU, RUANG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Target Class Selection (Per Kelas Saja) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <label className="block font-extrabold text-slate-800 text-sm">
              1. Pilih Kelas / Rombel Tujuan Impor Jadwal:
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={targetClassId}
                onChange={(e) => {
                  setTargetClassId(e.target.value);
                }}
                className="flex-1 min-w-[260px] p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500 shadow-2xs text-xs"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Jurusan {c.department} (Tingkat {c.grade})
                  </option>
                ))}
              </select>
              <span className="text-xs bg-cyan-100 text-cyan-950 font-bold px-3 py-2 rounded-xl border border-cyan-200">
                Jurusan: {targetClassObj?.department}
              </span>
            </div>
            {/* Target Week Rotation Selection */}
            <div className="pt-2.5 border-t border-slate-200 mt-2 space-y-1.5">
              <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-cyan-700" />
                <span>2. Tentukan Tipe Rotasi Pekan Jadwal:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetWeekType('P10_PROD_P11_NORM')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                    targetWeekType === 'P10_PROD_P11_NORM'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-extrabold text-xs text-emerald-950">Pekan K10 Prod & K11 Norm</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Kelas 10 Produktif / Lab, Kelas 11 Teori Umum
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetWeekType('P10_NORM_P11_PROD')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                    targetWeekType === 'P10_NORM_P11_PROD'
                      ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="font-extrabold text-xs text-purple-950">Pekan K10 Norm & K11 Prod</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Kelas 10 Teori Umum, Kelas 11 Produktif / Bengkel
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetWeekType('ALL')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                    targetWeekType === 'ALL'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="font-extrabold text-xs text-blue-950">Semua Pekan (Rutin)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Berlaku tetap setiap minggu (contoh: Upacara/Ekskul)
                  </p>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-1">
              * Sesuai ketentuan, impor jadwal <strong>diberlakukan per kelas saja</strong>. Ruangan
              tidak perlu dipilih manual terpisah, melainkan otomatis sinkron dari kolom{' '}
              <strong>RUANG</strong> pada file Excel Anda (misal: <em>R.J1</em>, <em>LAPANGAN</em>, dll).
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('file');
                  if (workbookRef && selectedSheet) {
                    parseWorkbookSheet(workbookRef, selectedSheet);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'file'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Pilih File Excel (.xlsx / .xls / .csv)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('text');
                  parseScheduleText(inputText);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'text'
                    ? 'bg-cyan-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Tempel Teks (Format Titik Koma ';')</span>
              </button>
            </div>

            {/* Template Download Button */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition"
              title="Unduh file template Excel sesuai format SMKN 1 Tegalsari"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unduh Template Excel (.xlsx)</span>
            </button>
          </div>

          {/* TAB 1: FILE EXCEL UPLOADER */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              {/* Drop / Pick Box */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/50'
                    : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100 hover:border-cyan-500'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 flex items-center justify-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>{selectedFile.name}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Ukuran: {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      Klik di sini untuk memilih file Excel jadwal
                    </p>
                    <p className="text-xs text-slate-500">
                      Mendukung format Microsoft Excel <strong>.xlsx</strong>, <strong>.xls</strong>, atau file <strong>.csv</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Multi-Sheet Selector if Workbook has multiple sheets */}
              {sheetNames.length > 1 && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">Pilih Sheet Excel:</span>
                  <select
                    value={selectedSheet}
                    onChange={(e) => {
                      setSelectedSheet(e.target.value);
                      if (workbookRef) {
                        parseWorkbookSheet(workbookRef, e.target.value);
                      }
                    }}
                    className="flex-1 p-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT MANUAL / PASTE */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Tempel Baris Jadwal (Format Titik Koma ';'):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setInputText(DEFAULT_SAMPLE_SCHEDULE);
                    parseScheduleText(DEFAULT_SAMPLE_SCHEDULE);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Muat Format Contoh</span>
                </button>
              </div>
              <textarea
                rows={7}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  parseScheduleText(e.target.value);
                }}
                placeholder="Tempel baris jadwal dengan format: HARI; JAM; PUKUL; MAPEL; KODE GURU; RUANG"
                className="w-full p-3 font-mono text-[11px] border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-slate-50 leading-relaxed resize-none"
              />
            </div>
          )}

          {/* Alert / Success notices */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successInfo && !errorMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Synchronization Summary Banner */}
          {parsedItems.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  <span>
                    Berhasil Membaca {parsedItems.length} Sesi Jam Pelajaran untuk {targetClassObj?.name}!
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 bg-white/70 px-2.5 py-0.5 rounded-full border border-slate-200">
                  Siap Diterapkan ke Sistem
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
                <div className="flex items-center gap-1.5 bg-white/90 p-2 rounded-lg border border-slate-200">
                  <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    <strong>{newTeachersToAdd.length}</strong> Guru Baru Disinkronkan
                    {newTeachersToAdd.length > 0 &&
                      ` (${newTeachersToAdd.map((t) => t.code).slice(0, 4).join(', ')}${
                        newTeachersToAdd.length > 4 ? '...' : ''
                      })`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/90 p-2 rounded-lg border border-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>{newRoomsToAdd.length}</strong> Ruang Baru Disinkronkan
                    {newRoomsToAdd.length > 0 &&
                      ` (${newRoomsToAdd.map((r) => r.code).slice(0, 4).join(', ')}${
                        newRoomsToAdd.length > 4 ? '...' : ''
                      })`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/90 p-2 rounded-lg border border-slate-200">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span>
                    <strong>{newSubjectsToAdd.length}</strong> Mapel Baru Disinkronkan
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedItems.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10">
                    <th className="p-2 text-center">HARI</th>
                    <th className="p-2 text-center">JAM</th>
                    <th className="p-2">PUKUL</th>
                    <th className="p-2">MAPEL</th>
                    <th className="p-2 text-center">KODE GURU</th>
                    <th className="p-2">GURU PENGAJAR</th>
                    <th className="p-2">KELAS</th>
                    <th className="p-2">RUANG (DARI DATA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedItems.slice(0, 40).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-bold text-slate-800 bg-slate-50">
                        {row.dayName}
                      </td>
                      <td className="p-2 text-center font-bold text-slate-900">{row.periodIndex}</td>
                      <td className="p-2 font-mono text-[11px] text-slate-600">{row.timeRange}</td>
                      <td className="p-2 font-semibold text-slate-900">{row.subjectName}</td>
                      <td className="p-2 text-center font-mono font-bold text-cyan-800 bg-cyan-50/60 rounded">
                        {row.teacherCode || '-'}
                      </td>
                      <td className="p-2 text-slate-700 truncate max-w-xs">{row.teacherName}</td>
                      <td className="p-2 font-semibold text-slate-700">{row.className}</td>
                      <td className="p-2 font-bold text-amber-900 bg-amber-50/70 rounded">
                        {row.roomName}
                      </td>
                    </tr>
                  ))}
                  {parsedItems.length > 40 && (
                    <tr>
                      <td colSpan={8} className="p-2 text-center text-xs text-slate-500 italic bg-slate-50">
                        ... dan {parsedItems.length - 40} baris jadwal lainnya
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === 'file' ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>{selectedFile ? 'Pilih File Lain' : 'Pilih File Excel'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => parseScheduleText(inputText)}
                className="px-3.5 py-1.5 font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition"
              >
                Uji Pratinjau Teks
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={parsedItems.length === 0}
              className={`px-5 py-2 font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                parsedItems.length > 0
                  ? 'text-white bg-emerald-700 hover:bg-emerald-800'
                  : 'text-slate-400 bg-slate-200 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                Terapkan Jadwal Kelas {targetClassObj?.name} ({parsedItems.length})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
