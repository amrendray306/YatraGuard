import React, { useState, useRef } from 'react';
import { X, Upload, ZoomIn, ZoomOut, Trash2, Check, AlertCircle, Camera } from 'lucide-react';
import { api, resolveMediaUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ProfileImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  onSuccess: (newUrl: string | null) => void;
}

export function ProfileImageModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSuccess,
}: ProfileImageModalProps) {
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Please select a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds the 5MB file size limit.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.post('/upload/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      const newUrl = res.data.url;
      updateUser({ avatarUrl: newUrl });
      onSuccess(newUrl);
      onClose();
    } catch (err: any) {
      console.error('Profile image upload failed:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.delete('/upload/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      updateUser({ avatarUrl: null });
      setSelectedFile(null);
      setPreviewUrl(null);
      onSuccess(null);
      onClose();
    } catch (err: any) {
      console.error('Delete avatar failed:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to remove image.');
    } finally {
      setLoading(false);
    }
  };

  const displayImage = previewUrl || resolveMediaUrl(currentAvatarUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Profile Photo</h3>
              <p className="text-xs text-slate-400">Upload or adjust your profile picture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Circular Avatar Preview Container */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-48 h-48 rounded-full border-4 border-amber-500/40 bg-slate-950 overflow-hidden flex items-center justify-center shadow-inner group">
            {displayImage ? (
              <img
                src={displayImage}
                alt="Profile Preview"
                style={{ transform: `scale(${zoom})` }}
                className="w-full h-full object-cover transition-transform duration-100 ease-out"
              />
            ) : (
              <div className="text-center p-4">
                <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-500 font-semibold">No Photo Uploaded</span>
              </div>
            )}
          </div>

          {/* Zoom Controls (only active when previewing a selected file or image) */}
          {displayImage && (
            <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
                className="text-slate-400 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                className="text-slate-400 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {selectedFile ? (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-amber-500/20"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving Photo...' : 'Save New Photo'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Select Image from Device</span>
            </button>
          )}

          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={loading}
              className="w-full py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Existing Profile Photo</span>
            </button>
          )}
        </div>

        <p className="text-[10px] text-center text-slate-500">
          Supports JPG, PNG, WebP up to 5MB. Face-centered automatic framing enabled.
        </p>
      </div>
    </div>
  );
}
