import { useState } from 'react';
import PropTypes from 'prop-types';
import { Upload, FileText, Image, File } from 'lucide-react';

export default function FileUpload({ onFileAnalyzed }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file) => {
    setSelectedFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const response = await fetch(`${base}/api/file/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.ok) {
        onFileAnalyzed({
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize,
          analysis: data.analysis
        });
      } else {
        alert('خطأ في رفع الملف: ' + data.error);
      }
    } catch (error) {
      console.warn('Upload error:', error);
      alert('فشل رفع الملف');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]" />;
    
    const type = selectedFile.type;
    if (type.startsWith('image/')) return <Image className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]" />;
    if (type.includes('text') || type.includes('json')) return <FileText className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]" />;
    return <File className="w-6 h-6 text-fuchsia-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]" />;
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        isDragging
          ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-900/50'
          : 'border-gray-700 hover:border-fuchsia-500/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileSelect}
        accept=".txt,.md,.json,.js,.mjs,.jsx,.ts,.tsx,.html,.css,.xml,.csv,.jpg,.jpeg,.png,.pdf"
      />

      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          {getFileIcon()}

          {uploading ? (
            <div className="text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
              <p>جاري الرفع...</p>
            </div>
          ) : selectedFile ? (
            <div>
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-gray-400 text-sm">{(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-textPrimary font-medium mb-2">
                اسحب الملف هنا أو اضغط للاختيار
              </p>
              <p className="text-gray-400 text-sm">
                الأنواع المدعومة: نصوص، صور، PDF، كود
              </p>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}

FileUpload.propTypes = {
  onFileAnalyzed: PropTypes.func.isRequired,
};
