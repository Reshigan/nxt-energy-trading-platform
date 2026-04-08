import React, { useRef, useState, useCallback } from 'react';
import { FiUploadCloud, FiX, FiFile } from '../../lib/fi-icons-shim';

interface FileUploadProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  helpText?: string;
}

export function FileUpload({
  onUpload,
  accept,
  maxSizeMB = 10,
  label = 'Upload file',
  helpText,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const validateAndSet = useCallback((file: File) => {
    setError('');
    if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMB}MB limit`);
      return;
    }
    setSelectedFile(file);
    onUpload(file);
  }, [maxSizeMB, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSet(file);
  }, [validateAndSet]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
  }, [validateAndSet]);

  return (
    <div className="space-y-1.5">
      {label && <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={`
          relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
            : 'border-black/[0.08] dark:border-white/[0.08] hover:border-blue-400 dark:hover:border-blue-500/30 bg-slate-50 dark:bg-white/[0.02]'
          }
        `}
      >
        <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" aria-hidden="true" />
        {selectedFile ? (
          <div className="flex items-center gap-3 w-full">
            <FiFile className="w-5 h-5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/[0.06]"
              aria-label="Remove file"
            >
              <FiX className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        ) : (
          <>
            <FiUploadCloud className="w-8 h-8 text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="text-blue-500 font-semibold">Click to upload</span> or drag and drop
            </p>
            {helpText && <p className="text-xs text-slate-400">{helpText}</p>}
          </>
        )}
      </div>
      {error && <p className="text-xs text-rose-500" role="alert">{error}</p>}
    </div>
  );
}
