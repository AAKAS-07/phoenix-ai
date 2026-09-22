import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Trash = () => {
  const { showToast, showConfirm } = useAuth();
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await api.get('/advisory/trash');
      if (res.data && res.data.success) {
        setTrashItems(res.data.advisories || res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching trash advisories:', err);
      showToast({
        title: 'Unable to Load Trash',
        message: err.response?.data?.message || 'Could not fetch deleted crop advisories.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id, cropName) => {
    try {
      const res = await api.post(`/advisory/${id}/restore`);
      if (res.data && res.data.success) {
        showToast({
          title: 'Advisory Restored',
          message: 'Crop advisory restored.',
          type: 'success'
        });
        setTrashItems((prev) => prev.filter((item) => (item._id || item.id) !== id));
      }
    } catch (err) {
      console.error('Error restoring advisory:', err);
      showToast({
        title: 'Restore Failed',
        message: err.response?.data?.message || 'Could not restore crop advisory.',
        type: 'error'
      });
    }
  };

  const handlePermanentDelete = (id, cropName) => {
    showConfirm({
      title: 'Delete permanently?',
      message: 'This crop advisory will be permanently deleted and cannot be restored.',
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => performPermanentDelete(id)
    });
  };

  const performPermanentDelete = async (id) => {
    try {
      const res = await api.delete(`/advisory/${id}/permanent`);
      if (res.data && res.data.success) {
        showToast({
          title: 'Permanently Deleted',
          message: 'Crop advisory permanently deleted.',
          type: 'info'
        });
        setTrashItems((prev) => prev.filter((item) => (item._id || item.id) !== id));
      }
    } catch (err) {
      console.error('Error permanently deleting advisory:', err);
      showToast({
        title: 'Deletion Failed',
        message: err.response?.data?.message || 'Could not permanently delete crop advisory.',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/settings"
            className="mb-2 text-slate-400 hover:text-brand-500 inline-flex items-center gap-1.5 text-xs font-bold transition-colors uppercase tracking-wider"
          >
            <i className="fas fa-arrow-left text-[10px]"></i> Back to Settings
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center text-lg shrink-0 shadow-xs border border-amber-200 dark:border-amber-800/50">
              <i className="fas fa-trash-can"></i>
            </div>
            <div>
              <h1 className="font-display font-black text-2xl text-slate-800 dark:text-white tracking-tight">
                Trash
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">
                Manage deleted crop advisories.
              </p>
            </div>
          </div>
        </div>

        {trashItems.length > 0 && (
          <span className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 text-xs font-extrabold flex items-center gap-2">
            <i className="fas fa-circle-info text-xs"></i>
            <span>{trashItems.length} Deleted {trashItems.length === 1 ? 'Record' : 'Records'}</span>
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
          <i className="fas fa-circle-notch fa-spin text-2xl text-brand-500 mb-2"></i>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">Loading Trash Items...</p>
          <p className="text-slate-400 text-xs">Fetching deleted crop advisories from database</p>
        </div>
      ) : trashItems.length > 0 ? (
        /* Grid of Deleted Advisories */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {trashItems.map((item) => {
            const itemId = item._id || item.id;
            const deletedDateStr = new Date(item.deletedAt || item.createdAt).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            return (
              <div
                key={itemId}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">

                  {/* Card Header: Crop Name & Stage Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-500 flex items-center justify-center text-lg shrink-0 border border-emerald-200 dark:border-emerald-800/50">
                        <i className="fas fa-seedling"></i>
                      </div>
                      <div>
                        <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base">
                          {item.cropType || 'Crop Advisory'}
                        </h3>
                        <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold">
                          Stage: <span className="text-slate-600 dark:text-slate-300 capitalize">{item.growthStage || 'Vegetative'}</span>
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-200 dark:border-amber-800/40">
                      In Trash
                    </span>
                  </div>

                  {/* Location & Soil Details */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <i className="fas fa-location-dot text-[10px] text-brand-500"></i>
                    <span>{[item.district, item.state].filter(Boolean).join(', ') || 'India'}</span>
                    {item.soilType && <span className="text-slate-300 dark:text-slate-700">•</span>}
                    {item.soilType && <span>Soil: {item.soilType} (pH {item.soilPH || '7.0'})</span>}
                  </p>

                  {/* Advisory Preview Snippet */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {item.irrigation || item.fertilizer || item.diseaseRisk || 'Crop guidance generated successfully.'}
                  </div>

                  {/* Deleted Timestamp */}
                  <div className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1.5 pt-1">
                    <i className="fas fa-clock text-[10px]"></i>
                    <span>Deleted: {deletedDateStr}</span>
                  </div>

                </div>

                {/* Actions: Revoke / Restore vs Permanently Delete */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleRestore(itemId, item.cropType)}
                    className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs transition-all border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <i className="fas fa-rotate-left text-xs"></i>
                    <span>Revoke</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(itemId, item.cropType)}
                    className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition-all border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <i className="fas fa-trash-can text-xs"></i>
                    <span>Permanently Delete</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Empty Trash State */
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto text-3xl border border-amber-200 dark:border-amber-800/50 shadow-xs">
            <i className="fas fa-trash-can"></i>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-lg">
              Trash is empty
            </h3>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Deleted crop advisories will appear here.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/advisory"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer"
            >
              <i className="fas fa-seedling text-xs"></i>
              <span>Go to Crop Advisory</span>
            </Link>
          </div>
        </div>
      )}

    </div>
  );
};

export default Trash;
