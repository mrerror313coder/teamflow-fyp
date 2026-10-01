import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { X, Upload, Link, FileText, CheckCircle2 } from 'lucide-react';

const SubmitWorkModal = ({ task, onClose, onSubmitted }) => {
  const [docLink, setDocLink] = useState(task.submission?.docLink || '');
  const [notes, setNotes] = useState(task.submission?.notes || '');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(task.submission?.fileUrl || '');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setFile(selectedFile);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      toast.loading('Uploading file to cloud storage...', { id: 'upload' });
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFileUrl(res.data.fileUrl);
      toast.success('File uploaded successfully!', { id: 'upload' });
    } catch (err) {
      toast.error('Upload failed: ' + (err.response?.data?.message || err.message), { id: 'upload' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docLink.trim() && !fileUrl) {
      toast.error('Please either paste a doc link OR upload a file');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put(`/task/${task._id}/submit`, {
        docLink,
        fileUrl,
        notes,
      });

      // Trigger celebratory confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success('Work submitted & leader notified via WhatsApp!');
      if (onSubmitted) onSubmitted(res.data.task);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Submit Completed Work</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">{task.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* File Upload Option (Cloudinary) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              Upload Deliverable File (PDF, DOCX, ZIP, Image - Max 10MB)
            </label>
            <div className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/50 rounded-xl p-4 text-center bg-slate-950/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.ppt,.pptx"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-7 h-7 text-indigo-400 mb-1.5" />
                <span className="text-xs font-semibold text-indigo-300">
                  {uploading ? 'Uploading to Cloudinary...' : file ? file.name : 'Choose file or drag here'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {fileUrl ? '✅ Uploaded to Cloudinary!' : 'Free cloud storage'}
                </span>
              </label>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs font-semibold">OR</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Google Doc / GitHub Link Option */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-purple-400" />
              Google Doc / GitHub / Figma URL
            </label>
            <input
              type="url"
              value={docLink}
              onChange={(e) => setDocLink(e.target.value)}
              placeholder="https://docs.google.com/document/d/... or https://github.com/..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Submission Notes / Remarks for Leader
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summarize key accomplishments or provide access instructions..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Mark Completed & Submit Work'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitWorkModal;
