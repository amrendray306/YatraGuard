import React, { useState, useEffect } from 'react';
import {
  Lock,
  PlusCircle,
  Trash2,
  ShieldCheck,
  Copy,
  Check,
  FileText,
  Upload,
  Download,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchVault,
  createVaultItem,
  deleteVaultItem,
  fetchVaultDocuments,
  uploadVaultDocument,
  downloadVaultDocumentBlob,
  deleteVaultDocument,
  fetchUserTrips,
} from '../services/api';
import { VaultItem, DocumentRecord, VaultDocType, Trip } from '../types';
import { PageHeader, EmptyState, ConfirmationModal } from '../components/ui';

const DOC_TYPES: { id: VaultDocType; label: string }[] = [
  { id: 'TICKET', label: 'Train / Flight Ticket' },
  { id: 'HOTEL', label: 'Hotel Booking' },
  { id: 'PERMIT', label: 'Travel / Inner Line Permit' },
  { id: 'ID_REF', label: 'ID Reference Copy' },
  { id: 'INSURANCE', label: 'Insurance Certificate' },
  { id: 'RESERVATION', label: 'Other Reservation' },
];

export const VaultPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Reference Codes (existing)
  const [items, setItems] = useState<VaultItem[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('INSURANCE');
  const [referenceData, setReferenceData] = useState('');
  const [notes, setNotes] = useState('');
  const [isAddingRef, setIsAddingRef] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Private Uploaded Documents (Module 14)
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    docType: 'TICKET' as VaultDocType,
    tripId: '',
    notes: '',
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);

  // Authenticated Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; mimeType: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'ref' | 'doc'; id: string } | null>(null);

  const loadAll = () => {
    if (!user) return;
    fetchVault().then(setItems).catch(() => {});
    fetchVaultDocuments()
      .then((res) => setDocuments(res.documents || []))
      .catch(() => {});
    fetchUserTrips().then(setTrips).catch(() => {});
  };

  useEffect(() => {
    loadAll();
  }, [user?.id]);

  const handleAddReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !referenceData) return;

    try {
      await createVaultItem({ title, category, referenceData, notes });
      setTitle('');
      setReferenceData('');
      setNotes('');
      setIsAddingRef(false);
      showToast(`Saved "${title}" reference`, 'success');
      loadAll();
    } catch {
      showToast('Failed to save vault reference', 'error');
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Sign in to store private travel documents', 'error');
      return;
    }
    if (!docForm.title.trim() || !docFile) {
      showToast('Document title and file are required', 'error');
      return;
    }

    setSavingDoc(true);
    try {
      const fd = new FormData();
      fd.append('title', docForm.title.trim());
      fd.append('docType', docForm.docType);
      if (docForm.tripId) fd.append('tripId', docForm.tripId);
      if (docForm.notes.trim()) fd.append('notes', docForm.notes.trim());
      fd.append('document', docFile);

      await uploadVaultDocument(fd);
      showToast('Document encrypted and stored privately', 'success');
      setDocForm({ title: '', docType: 'TICKET', tripId: '', notes: '' });
      setDocFile(null);
      setIsUploadingDoc(false);
      loadAll();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to upload private document', 'error');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDownloadOrPreview = async (doc: DocumentRecord, downloadOnly: boolean) => {
    try {
      const blob = await downloadVaultDocumentBlob(doc.id, downloadOnly);
      const url = URL.createObjectURL(blob);
      if (downloadOnly) {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.originalFilename || doc.title;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      } else {
        setPreviewDoc({ title: doc.title, url, mimeType: doc.mimeType });
      }
    } catch {
      showToast('Failed to access private document', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'doc') {
        await deleteVaultDocument(deleteTarget.id);
        showToast('Private document permanently deleted', 'info');
      } else {
        await deleteVaultItem(deleteTarget.id);
        showToast('Vault reference removed', 'info');
      }
      setDeleteTarget(null);
      loadAll();
    } catch {
      showToast('Failed to delete entry', 'error');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Reference copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16 yg-page-enter">
      <PageHeader
        eyebrow="Owner-Only Private Storage"
        icon={Lock}
        accentColor="emerald"
        title="Travel Document & Emergency Vault"
        description="Store private tickets, permits, hotel confirmations, and policy codes outside public directories."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setIsUploadingDoc(!isUploadingDoc);
                setIsAddingRef(false);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-colors keep-white yg-press"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>{isUploadingDoc ? 'Cancel Upload' : 'Upload Document'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingRef(!isAddingRef);
                setIsUploadingDoc(false);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-colors keep-white"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>{isAddingRef ? 'Cancel' : 'Add Reference Code'}</span>
            </button>
          </>
        }
      />

      {/* Security Privacy Notice */}
      <div className="yg-card p-4 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="leading-relaxed">
          <strong>Private Non-Public Access:</strong> Uploaded PDF/image files (max 5MB) are stored outside public web folders and streamed only when authenticated with your account JWT. Do not upload sensitive government IDs if traveling on shared devices.
        </div>
      </div>

      {/* Upload Document Form */}
      {isUploadingDoc && (
        <form onSubmit={handleUploadDoc} className="yg-card p-5 border-emerald-500/40 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Upload Private Travel Document (PDF, JPEG, PNG, WebP • Max 5MB)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={docForm.title}
                onChange={(e) => setDocForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Delhi-Manali Volvo E-Ticket"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Document Category
              </label>
              <select
                value={docForm.docType}
                onChange={(e) => setDocForm((p) => ({ ...p, docType: e.target.value as VaultDocType }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              >
                {DOC_TYPES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Link to Saved Trip (Optional)
              </label>
              <select
                value={docForm.tripId}
                onChange={(e) => setDocForm((p) => ({ ...p, tripId: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="">General Travel Vault</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.destinationCity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Select File *
              </label>
              <input
                type="file"
                required
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-700 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Notes</label>
              <input
                type="text"
                value={docForm.notes}
                onChange={(e) => setDocForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="e.g. Check-in time, seat number, or gate reference"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUploadingDoc(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingDoc}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold keep-white disabled:opacity-60"
            >
              {savingDoc ? 'Uploading...' : 'Store Privately'}
            </button>
          </div>
        </form>
      )}

      {/* Add Reference Code Form */}
      {isAddingRef && (
        <form onSubmit={handleAddReference} className="yg-card p-5 border-emerald-500/40 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Save New Reference Code</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="INSURANCE">Travel Insurance Policy</option>
                <option value="HOTEL_RES">Hotel Booking Reference</option>
                <option value="FLIGHT_TRAIN">Flight / Train PNR</option>
                <option value="VISA_REF">Visa Reference / Reg No</option>
                <option value="DOCTOR">Family Physician / ICE Contact</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Reference Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Overseas Medical Evacuation Policy"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Reference Code / Number / Contact
              </label>
              <input
                type="text"
                required
                value={referenceData}
                onChange={(e) => setReferenceData(e.target.value)}
                placeholder="e.g. POL-TATA-AIG-9988231 (Assistance: 1800-266-7780)"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">Additional Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cashless hospitalization reference"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingRef(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold keep-white"
            >
              Save Reference
            </button>
          </div>
        </form>
      )}

      {/* Private Uploaded Documents Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Private Uploaded Documents ({documents.length})
        </h2>

        {!user ? (
          <div className="yg-card p-5 text-xs text-slate-500 dark:text-slate-400">
            Sign in to upload and access private PDF tickets, bookings, and permits.
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Private Documents Uploaded"
            description="Upload train/flight tickets, hotel bookings, or permits (PDF/Image, max 5MB)."
            actionLabel="Upload First Document"
            onAction={() => setIsUploadingDoc(true)}
            accentColor="emerald"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="yg-card p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                      {doc.docType.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatBytes(doc.fileSize)}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{doc.title}</h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    File: {doc.originalFilename}
                    {doc.trip ? ` • Trip: ${doc.trip.title}` : ''}
                  </div>
                  {doc.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{doc.notes}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadOrPreview(doc, false)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadOrPreview(doc, true)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      Download
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ kind: 'doc', id: doc.id })}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                    title="Delete private document"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reference Codes Grid (Existing) */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Saved Reference Codes ({items.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="yg-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                    {item.category.replace('_', ' ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ kind: 'ref', id: item.id })}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">{item.title}</h3>

                <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300 select-all truncate mr-2">
                    {item.referenceData}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.referenceData, item.id)}
                    className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0"
                    title="Copy reference code"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {item.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
                    {item.notes}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
                Owner-only vault • {user?.name || 'Traveler'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Authenticated Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{previewDoc.title}</h3>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewDoc.url);
                  setPreviewDoc(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
              {previewDoc.mimeType.startsWith('image/') ? (
                <img src={previewDoc.url} alt={previewDoc.title} className="max-h-[75dvh] rounded-xl object-contain" />
              ) : (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-[72dvh] rounded-xl border border-slate-200 dark:border-slate-800"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Vault Entry"
        description="This will permanently remove the stored item from your private vault."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        tone="danger"
      />
    </div>
  );
};
