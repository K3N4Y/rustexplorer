import type { FileItem } from "../components/file-types";
import appIcon from "../assets/file-icons/app.svg";
import batIcon from "../assets/file-icons/bat.svg";
import csvIcon from "../assets/file-icons/csv.svg";
import docIcon from "../assets/file-icons/doc.svg";
import docxIcon from "../assets/file-icons/docx.svg";
import exeIcon from "../assets/file-icons/exe.svg";
import imageIcon from "../assets/file-icons/image.svg";
import jpgIcon from "../assets/file-icons/jpg.svg";
import jsIcon from "../assets/file-icons/js.svg";
import jsxIcon from "../assets/file-icons/jsx.svg";
import jsonIcon from "../assets/file-icons/json.svg";
import lnkIcon from "../assets/file-icons/lnk.svg";
import movIcon from "../assets/file-icons/mov.svg";
import mp3Icon from "../assets/file-icons/mp3.svg";
import mp4Icon from "../assets/file-icons/mp4.svg";
import msiIcon from "../assets/file-icons/msi.svg";
import musicIcon from "../assets/file-icons/music.svg";
import pdfIcon from "../assets/file-icons/pdf.svg";
import pngIcon from "../assets/file-icons/png.svg";
import pptxIcon from "../assets/file-icons/pptx.svg";
import ps1Icon from "../assets/file-icons/ps1.svg";
import pythonIcon from "../assets/file-icons/python.svg";
import rarIcon from "../assets/file-icons/rar.svg";
import rustIcon from "../assets/file-icons/rust.svg";
import sheetIcon from "../assets/file-icons/sheet.svg";
import svgFileIcon from "../assets/file-icons/svg.svg";
import textIcon from "../assets/file-icons/text.svg";
import tsIcon from "../assets/file-icons/ts.svg";
import tsxIcon from "../assets/file-icons/tsx.svg";
import txtIcon from "../assets/file-icons/txt.svg";
import videoIcon from "../assets/file-icons/video.svg";
import wavIcon from "../assets/file-icons/wav.svg";
import xlsxIcon from "../assets/file-icons/xlsx.svg";
import zipIcon from "../assets/file-icons/zip.svg";

type FileAppearance = {
  chipLabel: string;
  containerClassName: string;
  iconSrc: string | null;
};

const EXTENSION_MAP: Record<string, FileAppearance> = {
  "appref-ms": {
    chipLabel: "APP",
    containerClassName: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-300",
    iconSrc: appIcon,
  },
  bat: {
    chipLabel: "BAT",
    containerClassName: "bg-slate-500/10 text-slate-200 border-slate-500/20 dark:text-slate-100",
    iconSrc: batIcon,
  },
  bmp: {
    chipLabel: "BMP",
    containerClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300",
    iconSrc: imageIcon,
  },
  cmd: {
    chipLabel: "CMD",
    containerClassName: "bg-slate-500/10 text-slate-200 border-slate-500/20 dark:text-slate-100",
    iconSrc: batIcon,
  },
  com: {
    chipLabel: "COM",
    containerClassName: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-300",
    iconSrc: appIcon,
  },
  csv: {
    chipLabel: "CSV",
    containerClassName: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
    iconSrc: csvIcon,
  },
  doc: {
    chipLabel: "DOC",
    containerClassName: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    iconSrc: docIcon,
  },
  docx: {
    chipLabel: "DOCX",
    containerClassName: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    iconSrc: docxIcon,
  },
  exe: {
    chipLabel: "EXE",
    containerClassName: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-300",
    iconSrc: exeIcon,
  },
  gif: {
    chipLabel: "GIF",
    containerClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300",
    iconSrc: imageIcon,
  },
  ico: {
    chipLabel: "ICO",
    containerClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300",
    iconSrc: imageIcon,
  },
  jpeg: {
    chipLabel: "JPEG",
    containerClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300",
    iconSrc: jpgIcon,
  },
  jpg: {
    chipLabel: "JPG",
    containerClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300",
    iconSrc: jpgIcon,
  },
  js: {
    chipLabel: "JS",
    containerClassName: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-300",
    iconSrc: jsIcon,
  },
  json: {
    chipLabel: "JSON",
    containerClassName: "bg-slate-500/10 text-slate-100 border-slate-500/20 dark:text-slate-100",
    iconSrc: jsonIcon,
  },
  jsx: {
    chipLabel: "JSX",
    containerClassName: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-300",
    iconSrc: jsxIcon,
  },
  lnk: {
    chipLabel: "LNK",
    containerClassName: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-300",
    iconSrc: lnkIcon,
  },
  log: {
    chipLabel: "LOG",
    containerClassName: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300",
    iconSrc: textIcon,
  },
  m4a: {
    chipLabel: "M4A",
    containerClassName: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-300",
    iconSrc: musicIcon,
  },
  md: {
    chipLabel: "MD",
    containerClassName: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300",
    iconSrc: textIcon,
  },
  mov: {
    chipLabel: "MOV",
    containerClassName: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-300",
    iconSrc: movIcon,
  },
  mp3: {
    chipLabel: "MP3",
    containerClassName: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-300",
    iconSrc: mp3Icon,
  },
  mp4: {
    chipLabel: "MP4",
    containerClassName: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-300",
    iconSrc: mp4Icon,
  },
  msi: {
    chipLabel: "MSI",
    containerClassName: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-300",
    iconSrc: msiIcon,
  },
  odt: {
    chipLabel: "ODT",
    containerClassName: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    iconSrc: docIcon,
  },
  ods: {
    chipLabel: "ODS",
    containerClassName: "bg-lime-500/10 text-lime-700 border-lime-500/20 dark:text-lime-300",
    iconSrc: sheetIcon,
  },
  ogg: {
    chipLabel: "OGG",
    containerClassName: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-300",
    iconSrc: musicIcon,
  },
  pdf: {
    chipLabel: "PDF",
    containerClassName: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300",
    iconSrc: pdfIcon,
  },
  png: {
    chipLabel: "PNG",
    containerClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300",
    iconSrc: pngIcon,
  },
  pptx: {
    chipLabel: "PPTX",
    containerClassName: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300",
    iconSrc: pptxIcon,
  },
  ps1: {
    chipLabel: "PS1",
    containerClassName: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    iconSrc: ps1Icon,
  },
  py: {
    chipLabel: "PY",
    containerClassName: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
    iconSrc: pythonIcon,
  },
  rar: {
    chipLabel: "RAR",
    containerClassName: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    iconSrc: rarIcon,
  },
  rs: {
    chipLabel: "RS",
    containerClassName: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300",
    iconSrc: rustIcon,
  },
  rtf: {
    chipLabel: "RTF",
    containerClassName: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300",
    iconSrc: textIcon,
  },
  scr: {
    chipLabel: "SCR",
    containerClassName: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-300",
    iconSrc: appIcon,
  },
  svg: {
    chipLabel: "SVG",
    containerClassName: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-300",
    iconSrc: svgFileIcon,
  },
  tar: {
    chipLabel: "TAR",
    containerClassName: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    iconSrc: zipIcon,
  },
  ts: {
    chipLabel: "TS",
    containerClassName: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-300",
    iconSrc: tsIcon,
  },
  tsx: {
    chipLabel: "TSX",
    containerClassName: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-300",
    iconSrc: tsxIcon,
  },
  txt: {
    chipLabel: "TXT",
    containerClassName: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300",
    iconSrc: txtIcon,
  },
  wav: {
    chipLabel: "WAV",
    containerClassName: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-300",
    iconSrc: wavIcon,
  },
  webm: {
    chipLabel: "WEBM",
    containerClassName: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-300",
    iconSrc: videoIcon,
  },
  webp: {
    chipLabel: "WEBP",
    containerClassName: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300",
    iconSrc: imageIcon,
  },
  wmv: {
    chipLabel: "WMV",
    containerClassName: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-300",
    iconSrc: videoIcon,
  },
  xls: {
    chipLabel: "XLS",
    containerClassName: "bg-lime-500/10 text-lime-700 border-lime-500/20 dark:text-lime-300",
    iconSrc: sheetIcon,
  },
  xlsx: {
    chipLabel: "XLSX",
    containerClassName: "bg-lime-500/10 text-lime-700 border-lime-500/20 dark:text-lime-300",
    iconSrc: xlsxIcon,
  },
  yml: {
    chipLabel: "YML",
    containerClassName: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300",
    iconSrc: textIcon,
  },
  yaml: {
    chipLabel: "YAML",
    containerClassName: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300",
    iconSrc: textIcon,
  },
  zip: {
    chipLabel: "ZIP",
    containerClassName: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    iconSrc: zipIcon,
  },
  "7z": {
    chipLabel: "7Z",
    containerClassName: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    iconSrc: zipIcon,
  },
  gz: {
    chipLabel: "GZ",
    containerClassName: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    iconSrc: zipIcon,
  },
};

function getExtension(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

export function getFileAppearance(file: FileItem): FileAppearance {
  if (file.isDirectory) {
    return {
      chipLabel: "DIRECTORY",
      containerClassName: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      iconSrc: null,
    };
  }

  const extension = getExtension(file.name);
  const group = EXTENSION_MAP[extension];

  if (group) {
    return {
      chipLabel: group.chipLabel,
      containerClassName: group.containerClassName,
      iconSrc: group.iconSrc,
    };
  }

  return {
    chipLabel: extension ? extension.toUpperCase() : "FILE",
    containerClassName: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-300",
    iconSrc: null,
  };
}
