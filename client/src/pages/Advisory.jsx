import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ALL_INDIAN_STATES, getDistrictsForState } from '../data/indiaData';

const Advisory = () => {
  const { showToast, showConfirm } = useAuth();

  // Form State
  const [crop, setCrop] = useState('');
  const [growthStage, setGrowthStage] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [soilPH, setSoilPH] = useState('');
  const [soilType, setSoilType] = useState('loam');

  // Dropdown Lists State
  const [statesList, setStatesList] = useState(ALL_INDIAN_STATES);
  const [districtsList, setDistrictsList] = useState([]);
  const [availableGrowthStages, setAvailableGrowthStages] = useState([]);

  // Async & Data State
  const [loading, setLoading] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [history, setHistory] = useState([]);

  // Modals & Overlays State
  const [showResultModal, setShowResultModal] = useState(false);
  const [activeAdvisory, setActiveAdvisory] = useState(null);

  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState('');
  const [pdfPreviewFilename, setPdfPreviewFilename] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Lock background scroll when any modal is active
  useEffect(() => {
    if (showResultModal || showPdfPreviewModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showResultModal, showPdfPreviewModal]);

  // Handle ESC key to close active overlay modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showPdfPreviewModal) {
          closePdfPreviewModal();
        } else if (showResultModal) {
          setShowResultModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResultModal, showPdfPreviewModal]);

  // Load initial dropdown data and saved history
  useEffect(() => {
    fetchStates();
    fetchHistory();
  }, []);

  const fetchStates = async () => {
    try {
      const res = await api.get('/mandi/states');
      if (res.data && res.data.success && Array.isArray(res.data.states)) {
        const merged = Array.from(new Set([...ALL_INDIAN_STATES, ...res.data.states])).sort();
        setStatesList(merged);
      }
    } catch (err) {
      console.error('Error fetching states:', err);
      setStatesList(ALL_INDIAN_STATES);
    }
  };

  const fetchDistricts = async (selectedState) => {
    if (!selectedState) {
      setDistrictsList([]);
      return;
    }
    const localDefaults = getDistrictsForState(selectedState);
    setDistrictsList(localDefaults);
    setLoadingDistricts(true);
    try {
      const res = await api.get(`/mandi/districts?state=${encodeURIComponent(selectedState)}`);
      if (res.data && res.data.success && Array.isArray(res.data.districts)) {
        const merged = Array.from(new Set([...localDefaults, ...res.data.districts])).sort();
        setDistrictsList(merged);
      }
    } catch (err) {
      console.error('Error fetching districts:', err);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/advisory/history');
      if (res.data && res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching advisory history:', err);
    }
  };

  const handleCropChange = (e) => {
    const selectedCrop = e.target.value;
    setCrop(selectedCrop);
    setGrowthStage('');

    const growthStagesMap = {
      wheat: ['sowing', 'vegetative', 'flowering', 'grain_fill', 'harvest'],
      rice: ['sowing', 'transplanting', 'tillering', 'flowering', 'grain_fill', 'harvest'],
      cotton: ['sowing', 'vegetative', 'flowering', 'boll_development', 'harvest'],
      sugarcane: ['planting', 'tillering', 'grand_growth', 'maturity', 'harvest'],
      maize: ['sowing', 'emergence', 'vegetative', 'tasseling', 'grain_fill', 'harvest'],
      soybean: ['sowing', 'vegetative', 'flowering', 'pod_development', 'harvest'],
      potato: ['planting', 'sprout', 'vegetative', 'tuber_initiation', 'tuber_bulking', 'harvest'],
      tomato: ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest']
    };

    setAvailableGrowthStages(growthStagesMap[selectedCrop] || ['sowing', 'vegetative', 'flowering', 'harvest']);
  };

  const handleStateChange = (e) => {
    const val = e.target.value;
    setState(val);
    setDistrict('');
    fetchDistricts(val);
  };

  // Reusable Single PDF Generation Function
  const generateAdvisoryPDFDoc = async (advisoryObj) => {
    if (!advisoryObj || typeof advisoryObj !== 'object') {
      throw new Error('Valid advisory data is required to generate PDF.');
    }

    let jsPDFClass = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFClass) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load PDF generator engine'));
        document.head.appendChild(script);
      });
      jsPDFClass = window.jspdf?.jsPDF || window.jsPDF;
    }

    if (!jsPDFClass) {
      throw new Error('PDF generator engine could not be initialized.');
    }

    const doc = new jsPDFClass({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 15;

    const checkPageBreak = (neededHeight) => {
      if (currentY + neededHeight > pageHeight - 15) {
        doc.addPage();
        currentY = 15;
      }
    };

    const selectedCrop = advisoryObj.input?.crop || advisoryObj.cropType || crop || 'Crop';
    const selectedStage = advisoryObj.input?.growthStage || advisoryObj.growthStage || growthStage || 'N/A';
    const selectedState = advisoryObj.input?.location?.state || advisoryObj.state || state || '';
    const selectedDistrict = advisoryObj.input?.location?.district || advisoryObj.district || district || '';
    const locationStr = [selectedDistrict, selectedState].filter(Boolean).join(', ') || 'India';
    const soilTypeStr = advisoryObj.input?.soil?.type || advisoryObj.soilType || soilType || 'Loam';
    const soilPHStr = advisoryObj.input?.soil?.ph || advisoryObj.soilPH || soilPH || '7.0';
    const createdDate = advisoryObj.createdAt ? new Date(advisoryObj.createdAt) : new Date();
    const dateStr = createdDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    // Header Banner (Forest Green #237A3B)
    doc.setFillColor(35, 122, 59);
    doc.rect(margin, currentY, contentWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Phoenix AI - Crop Advisory Report', margin + 6, currentY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${dateStr}`, margin + 6, currentY + 16);

    currentY += 28;

    // Section 1: Field & Environmental Conditions
    checkPageBreak(36);
    doc.setFillColor(244, 250, 246);
    doc.rect(margin, currentY, contentWidth, 34, 'F');
    doc.setDrawColor(221, 245, 228);
    doc.rect(margin, currentY, contentWidth, 34, 'S');

    doc.setTextColor(35, 122, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('FIELD & ENVIRONMENTAL CONDITIONS', margin + 6, currentY + 8);

    doc.setTextColor(20, 43, 32);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Selected Crop: ', margin + 6, currentY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedCrop.toUpperCase()}`, margin + 34, currentY + 16);

    doc.setFont('helvetica', 'bold');
    doc.text('Growth Stage: ', margin + 95, currentY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedStage}`, margin + 125, currentY + 16);

    doc.setFont('helvetica', 'bold');
    doc.text('Location: ', margin + 6, currentY + 23);
    doc.setFont('helvetica', 'normal');
    doc.text(`${locationStr}`, margin + 34, currentY + 23);

    doc.setFont('helvetica', 'bold');
    doc.text('Soil & pH: ', margin + 95, currentY + 23);
    doc.setFont('helvetica', 'normal');
    doc.text(`${soilTypeStr} (pH ${soilPHStr})`, margin + 125, currentY + 23);

    doc.setFont('helvetica', 'bold');
    doc.text('Weather: ', margin + 6, currentY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`${advisoryObj.weather?.temperature ?? 24}°C, Humidity ${advisoryObj.weather?.humidity ?? 60}%`, margin + 34, currentY + 30);

    doc.setFont('helvetica', 'bold');
    doc.text('Disease Risk: ', margin + 95, currentY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`${advisoryObj.diseaseRisk || 'Low'} Risk`, margin + 125, currentY + 30);

    currentY += 40;

    // Helper section drawer
    const drawSection = (title, contentText) => {
      const textToDraw = contentText || 'No specific recommendation recorded for this section.';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitLines = doc.splitTextToSize(textToDraw, contentWidth - 12);
      const boxHeight = 12 + (splitLines.length * 4.5);

      checkPageBreak(boxHeight + 4);

      doc.setFillColor(255, 255, 255);
      doc.rect(margin, currentY, contentWidth, boxHeight, 'F');
      doc.setDrawColor(221, 245, 228);
      doc.rect(margin, currentY, contentWidth, boxHeight, 'S');

      doc.setTextColor(35, 122, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(title, margin + 6, currentY + 7);

      doc.setTextColor(97, 117, 104);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(splitLines, margin + 6, currentY + 13);

      currentY += boxHeight + 4;
    };

    drawSection('IRRIGATION ADVISORY', advisoryObj.irrigationAdvice || advisoryObj.irrigation);
    drawSection('FERTILIZER RECOMMENDATION', advisoryObj.fertilizerRecommendation || advisoryObj.fertilizer);
    drawSection('DISEASE & PEST PREVENTION', advisoryObj.diseaseRecommendation || (advisoryObj.diseaseFactors ? advisoryObj.diseaseFactors.join(', ') : ''));
    drawSection('YIELD ESTIMATE', advisoryObj.yieldPrediction);
    drawSection('MARKET & SALES STRATEGY', advisoryObj.marketSuggestion || advisoryObj.marketTrend);

    // Disclaimer Note
    checkPageBreak(16);
    doc.setFillColor(255, 250, 240);
    doc.rect(margin, currentY, contentWidth, 11, 'F');
    doc.setDrawColor(232, 201, 121);
    doc.rect(margin, currentY, contentWidth, 11, 'S');

    doc.setTextColor(122, 107, 69);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Important Note: Decision support system — confirm critical agricultural interventions with local extension services.', margin + 4, currentY + 7);

    const safeCrop = String(selectedCrop).replace(/[^a-zA-Z0-9]/g, '');
    const safeDistrict = String(selectedDistrict).replace(/[^a-zA-Z0-9]/g, '') || 'District';
    const dateTag = new Date().toISOString().slice(0, 10);
    const fileName = `AI-Crop-Advisory-${safeCrop}-${safeDistrict}-${dateTag}.pdf`;

    return { doc, fileName, selectedCrop, locationStr };
  };

  // Direct Download PDF Action
  const handleDownloadPdf = async (itemToExport = null) => {
    const advisory = itemToExport || activeAdvisory;
    if (!advisory) {
      showToast({
        title: 'Validation Error',
        message: 'No advisory data available for PDF export.',
        type: 'warning'
      });
      return;
    }

    setGeneratingPdf(true);
    try {
      const { doc, fileName, selectedCrop, locationStr } = await generateAdvisoryPDFDoc(advisory);
      doc.save(fileName);

      // Log activity
      try {
        await api.post('/activity', {
          type: 'advisory_pdf_downloaded',
          title: 'Crop Advisory PDF Exported',
          description: `Downloaded PDF report for ${selectedCrop} (${locationStr})`
        });
      } catch (actErr) {}

      showToast({
        title: 'Download Complete',
        message: 'Your AI crop advisory report PDF was generated and downloaded successfully.',
        type: 'success'
      });
    } catch (err) {
      console.error('PDF download error:', err);
      showToast({
        title: 'PDF Export Error',
        message: err.message || 'Unable to generate the PDF. Please try again.',
        type: 'error'
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // PDF Preview Action (Opens Overlay Modal)
  const handlePreviewPdf = async (itemToExport) => {
    if (!itemToExport) return;
    setGeneratingPdf(true);
    try {
      const { doc, fileName } = await generateAdvisoryPDFDoc(itemToExport);
      const pdfBlob = doc.output('blob');
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Generated PDF content is empty');
      }

      if (pdfPreviewBlobUrl) {
        URL.revokeObjectURL(pdfPreviewBlobUrl);
      }

      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfPreviewBlobUrl(blobUrl);
      setPdfPreviewFilename(fileName);
      setShowPdfPreviewModal(true);
    } catch (err) {
      console.error('PDF preview error:', err);
      showToast({
        title: 'PDF Preview Error',
        message: err.message || 'Unable to generate PDF preview. Please try again.',
        type: 'error'
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const closePdfPreviewModal = () => {
    setShowPdfPreviewModal(false);
    if (pdfPreviewBlobUrl) {
      URL.revokeObjectURL(pdfPreviewBlobUrl);
      setPdfPreviewBlobUrl('');
    }
  };

  // Handle Form Submission -> Opens Advisory Result Modal
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!crop || !growthStage) {
      showToast({
        title: 'Invalid Form Submission',
        message: 'Please select crop type and growth stage.',
        type: 'warning'
      });
      return;
    }
    if (!state) {
      showToast({
        title: 'Invalid Form Submission',
        message: 'Please select a state location to continue.',
        type: 'warning'
      });
      return;
    }
    if (!district) {
      showToast({
        title: 'Invalid Form Submission',
        message: `Please select a district for ${state} to continue.`,
        type: 'warning'
      });
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/advisory', {
        crop,
        growthStage,
        state,
        district,
        soilPH: soilPH || '7.0',
        soilType
      });

      if (res.data && res.data.success) {
        const generatedData = res.data.data;
        setActiveAdvisory(generatedData);
        setShowResultModal(true); // Open Overlapping Result Modal!

        showToast({
          title: 'Advisory Generated',
          message: 'AI crop guidance created successfully.',
          type: 'success'
        });

        // Save result to DB
        saveAdvisoryToDb(generatedData);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message ||
                       err.response?.data?.error ||
                       (Array.isArray(err.response?.data?.details) ? err.response.data.details.join(', ') : null) ||
                       err.message ||
                       'Please try again.';
      showToast({
        title: 'Unable to Generate Advisory',
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAdvisoryToDb = async (dataToSave) => {
    try {
      const res = await api.post('/advisory/save', {
        cropType: dataToSave.input?.crop || crop,
        growthStage: dataToSave.input?.growthStage || growthStage,
        state: dataToSave.input?.location?.state || state,
        district: dataToSave.input?.location?.district || district,
        soilPH: dataToSave.input?.soil?.ph || soilPH || '7.0',
        soilType: dataToSave.input?.soil?.type || soilType,
        weather: dataToSave.weather,
        irrigation: dataToSave.irrigationAdvice,
        diseaseRisk: dataToSave.diseaseRisk,
        fertilizer: dataToSave.fertilizerRecommendation,
        yieldPrediction: dataToSave.yieldPrediction,
        marketSuggestion: dataToSave.marketSuggestion
      });
      if (res.data && res.data.success && res.data.data) {
        setActiveAdvisory(res.data.data);
      }
      fetchHistory();
    } catch (err) {
      console.error('Error auto-saving advisory to database:', err);
    }
  };

  // Delete advisory with confirmation modal
  const handleDeleteAdvisory = (e, id) => {
    e.stopPropagation();
    if (!id) return;
    if (showConfirm) {
      showConfirm({
        title: 'Delete this advisory?',
        message: 'This advisory will be moved to Trash and removed from your active history.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: () => performDeleteAdvisory(id)
      });
    } else {
      performDeleteAdvisory(id);
    }
  };

  const performDeleteAdvisory = async (id) => {
    if (!id) return;
    try {
      const res = await api.delete(`/advisory/${id}`);
      if (res.data && res.data.success) {
        showToast({
          title: 'Advisory Moved to Trash',
          message: 'Crop advisory moved to Trash.',
          type: 'info'
        });
        fetchHistory();
        if (activeAdvisory && (activeAdvisory._id === id || activeAdvisory.id === id)) {
          setShowResultModal(false);
          setActiveAdvisory(null);
        }
      }
    } catch (err) {
      console.error('Delete advisory error:', err);
      showToast({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Could not move advisory record to Trash.',
        type: 'error'
      });
    }
  };

  const capabilityChips = [
    { label: '🌱 Healthy Crop Analysis', icon: 'fa-wheat-awn' },
    { label: '💧 Irrigation Recommended', icon: 'fa-droplet' },
    { label: '🌤 Weather Advisory', icon: 'fa-cloud-sun' },
    { label: '🐛 Pest Risk Assessment', icon: 'fa-bug' },
    { label: '🌾 Fertilizer Guidance', icon: 'fa-leaf' }
  ];

  return (
    <div className="view-transition space-y-8 relative pb-12">

      {/* 1. Hero Header Section */}
      <div className="agri-card p-6 sm:p-8 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center text-2xl font-bold shrink-0">
              <i className="fas fa-wheat-awn"></i>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="page-title text-[#166534]">
                  Agriculture Advisory
                </h1>
                <span className="badge-success text-[10px]">
                  Smart Engine Online
                </span>
              </div>
              <p className="text-[#64748B] text-xs sm:text-sm font-medium max-w-2xl">
                Trustworthy crop guidance, smart irrigation alerts, fertilizer schedules, pest risk mitigation, and yield predictions.
              </p>
            </div>
          </div>

        </div>

        {/* 2. Capability Chips */}
        <div className="pt-4 border-t border-[#E2E8F0] flex items-center gap-2 flex-wrap">
          {capabilityChips.map((chip, idx) => (
            <span key={idx} className="badge-info text-xs">
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Field Information Form Card */}
      <div className="agri-card p-6 sm:p-8 space-y-6">

        <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
          <div>
            <h3 className="card-heading flex items-center gap-2 text-[#166534]">
              <i className="fas fa-seedling text-[#22C55E]"></i> Field Information
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Enter your crop and field details to receive automated recommendations.
            </p>
          </div>
          <span className="badge-gold">
            Step 1 of 1
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Row 1: Crop Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-[#142B20] dark:text-slate-200">
                🌾 Crop Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={crop}
                onChange={handleCropChange}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#142B20] dark:text-white focus:outline-none focus:border-[#237A3B] focus:ring-2 focus:ring-[#237A3B]/10 hover:border-emerald-300 transition-all"
              >
                <option value="">Select your crop...</option>
                <option value="wheat">Wheat</option>
                <option value="rice">Rice</option>
                <option value="cotton">Cotton</option>
                <option value="sugarcane">Sugarcane</option>
                <option value="maize">Maize</option>
                <option value="soybean">Soybean</option>
                <option value="potato">Potato</option>
                <option value="tomato">Tomato</option>
              </select>
            </div>

            {/* Row 1: Growth Stage */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-[#142B20] dark:text-slate-200">
                📈 Growth Stage <span className="text-rose-500">*</span>
              </label>
              <select
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value)}
                required
                disabled={!crop}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#142B20] dark:text-white focus:outline-none focus:border-[#237A3B] focus:ring-2 focus:ring-[#237A3B]/10 hover:border-emerald-300 transition-all disabled:opacity-50 cursor-pointer"
              >
                <option value="">{crop ? 'Select growth stage...' : 'Select Crop First'}</option>
                {availableGrowthStages.map((stage) => (
                  <option key={stage} value={stage} className="capitalize">
                    {stage.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 2: State / UT */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-[#142B20] dark:text-slate-200">
                🗺 State / UT <span className="text-rose-500">*</span>
              </label>
              <select
                value={state}
                onChange={handleStateChange}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#142B20] dark:text-white focus:outline-none focus:border-[#237A3B] focus:ring-2 focus:ring-[#237A3B]/10 hover:border-emerald-300 transition-all"
              >
                <option value="">Select state...</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Row 2: District */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-[#142B20] dark:text-slate-200">
                📍 District <span className="text-rose-500">*</span>
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                disabled={!state || loadingDistricts}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#142B20] dark:text-white focus:outline-none focus:border-[#237A3B] focus:ring-2 focus:ring-[#237A3B]/10 hover:border-emerald-300 transition-all disabled:opacity-50 cursor-pointer"
              >
                <option value="">
                  {loadingDistricts ? 'Loading Districts...' : state ? '📍 Select District' : '📍 Select State First'}
                </option>
                {districtsList.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            {/* Row 3: Soil Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-[#142B20] dark:text-slate-200">
                🧪 Soil Type
              </label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#142B20] dark:text-white focus:outline-none focus:border-[#237A3B] focus:ring-2 focus:ring-[#237A3B]/10 hover:border-emerald-300 transition-all"
              >
                <option value="loam">Loam Soil</option>
                <option value="clay">Clay Soil</option>
                <option value="sandy">Sandy Soil</option>
                <option value="black">Black Cotton Soil</option>
                <option value="red">Red Soil</option>
                <option value="alluvial">Alluvial Soil</option>
              </select>
            </div>

            {/* Row 3: Soil pH */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-[#142B20] dark:text-slate-200">
                ⚗️ Soil pH (Optional)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="14"
                placeholder="e.g. 6.8"
                value={soilPH}
                onChange={(e) => setSoilPH(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#142B20] dark:text-white focus:outline-none focus:border-[#237A3B] focus:ring-2 focus:ring-[#237A3B]/10 hover:border-emerald-300 transition-all"
              />
            </div>

          </div>

          {/* CTA Generate AI Advisory Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-[#237A3B] to-[#2F8F4E] hover:from-[#1d6631] hover:to-[#267741] text-white font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-[#237A3B]/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer disabled:opacity-60 group"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin text-base"></i>
                  <span>Analyzing your field...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-robot text-base text-[#8FE3A8] group-hover:scale-110 transition-transform"></i>
                  <span>Generate AI Advisory</span>
                  <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </button>
          </div>
        </form>

      </div>

      {/* 4. AI Processing Loading Overlay Modal */}
      {loading && (
        <div className="fixed inset-0 bg-[#142B20]/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl border border-emerald-100 dark:border-slate-800 animate-scale-up">
            <div className="relative w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-slate-800 border border-[#8FE3A8]/40 flex items-center justify-center mx-auto text-3xl text-[#237A3B] dark:text-[#8FE3A8] shadow-lg animate-logo-glow">
              <i className="fas fa-seedling animate-bounce"></i>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#8FE3A8] rounded-full animate-ping"></div>
            </div>

            <div>
              <h3 className="font-display font-black text-lg text-[#142B20] dark:text-white">
                AI is Analyzing Your Field
              </h3>
              <p className="text-xs text-[#617568] dark:text-slate-400 mt-1">
                Processing soil health, crop growth stage & real-time weather feeds...
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-bold text-[#617568] dark:text-slate-300 pt-2">
              <span className="flex items-center gap-1.5"><i className="fas fa-circle-check text-[#237A3B] dark:text-[#8FE3A8]"></i> Crop</span>
              <span className="flex items-center gap-1.5"><i className="fas fa-circle-check text-[#237A3B] dark:text-[#8FE3A8]"></i> Soil</span>
              <span className="flex items-center gap-1.5"><i className="fas fa-circle-check text-[#237A3B] dark:text-[#8FE3A8]"></i> Location</span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#237A3B] to-[#8FE3A8] h-full w-3/4 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Saved Advisory History Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">

        {/* History Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF5E4] dark:bg-slate-800 text-[#237A3B] dark:text-[#8FE3A8] flex items-center justify-center text-lg font-bold border border-[#8FE3A8]/30">
              <i className="fas fa-clock-rotate-left"></i>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base sm:text-lg text-[#142B20] dark:text-white">
                Saved Advisory History
              </h3>
              <p className="text-xs text-[#617568] dark:text-slate-400">Your recently generated field recommendations</p>
            </div>
          </div>

          <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-[#237A3B]/10 text-[#237A3B] dark:bg-[#8FE3A8]/20 dark:text-[#8FE3A8] border border-[#237A3B]/20">
            {history.length} SAVED
          </span>
        </div>

        {/* History Cards Grid */}
        {history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((item, idx) => (
              <div
                key={item._id || idx}
                className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 hover:border-[#8FE3A8] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 space-y-3 group"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#142B20] dark:text-white capitalize group-hover:text-[#237A3B] dark:group-hover:text-[#8FE3A8] transition-colors">
                      🌾 {item.cropType}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#DDF5E4] text-[#237A3B] dark:bg-[#8FE3A8]/20 dark:text-[#8FE3A8]">
                      {item.growthStage}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <p className="text-xs text-[#617568] dark:text-slate-300 font-medium flex items-center gap-1.5">
                  <i className="fas fa-location-dot text-[10px] text-[#237A3B] dark:text-[#8FE3A8]"></i>
                  <span>{[item.district, item.state].filter(Boolean).join(', ') || 'India'}</span>
                </p>

                <p className="text-xs text-[#617568] dark:text-slate-400 leading-relaxed line-clamp-2">
                  {item.irrigation || item.fertilizer || item.diseaseRisk || 'Crop recommendation generated successfully.'}
                </p>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAdvisory(item);
                      setShowResultModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#237A3B]/10 hover:bg-[#237A3B]/20 text-[#237A3B] dark:bg-[#8FE3A8]/15 dark:hover:bg-[#8FE3A8]/25 dark:text-[#8FE3A8] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fas fa-eye text-xs"></i>
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePreviewPdf(item)}
                    disabled={generatingPdf}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-[#237A3B] hover:text-white dark:hover:bg-[#237A3B] text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <i className="fas fa-file-pdf text-xs"></i>
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteAdvisory(e, item._id || item.id)}
                    className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-rose-500 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold cursor-pointer"
                    title="Delete Advisory"
                  >
                    <i className="fas fa-trash-can text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty History State */
          <div className="p-10 text-center bg-slate-50/80 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#DDF5E4] dark:bg-slate-800 text-[#237A3B] dark:text-[#8FE3A8] flex items-center justify-center mx-auto text-2xl animate-leaf-1">
              <i className="fas fa-seedling"></i>
            </div>
            <div>
              <h4 className="font-extrabold text-[#142B20] dark:text-white text-base">No advisories yet</h4>
              <p className="text-[#617568] dark:text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                Generate your first AI crop advisory above to receive personalized recommendations.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. OVERLAPPING MODAL 1: AI CROP ADVISORY RESULT MODAL (z-[60])           */}
      {/* ========================================================================= */}
      {showResultModal && activeAdvisory && (
        <div
          onClick={() => setShowResultModal(false)}
          className="fixed inset-0 bg-[#142B20]/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 animate-logo-fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-scale-up"
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-[#237A3B] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-[#8FE3A8] text-xl">
                  <i className="fas fa-seedling"></i>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                    🌱 AI Crop Advisory Result
                  </h3>
                  <p className="text-xs text-[#DDF5E4]">
                    {activeAdvisory.input?.crop || activeAdvisory.cropType} • {activeAdvisory.input?.growthStage || activeAdvisory.growthStage}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowResultModal(false)}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <i className="fas fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-hide text-[#142B20] dark:text-slate-100">

              {/* Field & Location Banner */}
              <div className="bg-gradient-to-r from-[#237A3B] via-[#2F8F4E] to-[#1d6631] rounded-2xl p-5 text-white flex items-center justify-between flex-wrap gap-4 shadow-md">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#DDF5E4] tracking-widest block">Field Location</span>
                  <h4 className="font-extrabold text-lg mt-0.5">
                    {[activeAdvisory.input?.location?.district || activeAdvisory.district, activeAdvisory.input?.location?.state || activeAdvisory.state].filter(Boolean).join(', ') || 'India'}
                  </h4>
                  <p className="text-xs text-[#DDF5E4] mt-1">
                    Soil: {activeAdvisory.input?.soil?.type || activeAdvisory.soilType || 'Loam'} (pH {activeAdvisory.input?.soil?.ph || activeAdvisory.soilPH || '7.0'})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xl font-black">{activeAdvisory.weather?.temperature ?? 24}°C</span>
                    <p className="text-[11px] text-[#DDF5E4]">Humidity: {activeAdvisory.weather?.humidity ?? 60}%</p>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/20 text-[#DDF5E4] text-xs font-extrabold border border-white/30">
                    {activeAdvisory.diseaseRisk || 'Low'} Risk
                  </div>
                </div>
              </div>

              {/* Advisory Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Irrigation Advice */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-droplet text-sky-500 text-base"></i>
                    <h5 className="font-bold text-sm text-[#142B20] dark:text-white">Irrigation Advisory</h5>
                  </div>
                  <p className="text-xs text-[#617568] dark:text-slate-300 leading-relaxed">
                    {activeAdvisory.irrigationAdvice || activeAdvisory.irrigation || 'Maintain regular watering schedule based on field conditions.'}
                  </p>
                </div>

                {/* Fertilizer Recommendation */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-flask text-amber-500 text-base"></i>
                    <h5 className="font-bold text-sm text-[#142B20] dark:text-white">Fertilizer (NPK)</h5>
                  </div>
                  <p className="text-xs text-[#617568] dark:text-slate-300 leading-relaxed">
                    {activeAdvisory.fertilizerRecommendation || activeAdvisory.fertilizer || 'Balanced nutrient application recommended for stage.'}
                  </p>
                </div>

                {/* Pest & Disease Prevention */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-shield-virus text-rose-500 text-base"></i>
                    <h5 className="font-bold text-sm text-[#142B20] dark:text-white">Pest & Disease Prevention</h5>
                  </div>
                  <p className="text-xs text-[#617568] dark:text-slate-300 leading-relaxed">
                    {activeAdvisory.diseaseRecommendation || (activeAdvisory.diseaseFactors ? activeAdvisory.diseaseFactors.join(', ') : 'Scout field regularly for early disease indicators.')}
                  </p>
                </div>

                {/* Yield Prediction */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-chart-line text-purple-500 text-base"></i>
                    <h5 className="font-bold text-sm text-[#142B20] dark:text-white">Yield Estimate</h5>
                  </div>
                  <p className="text-xs text-[#617568] dark:text-slate-300 leading-relaxed">
                    {activeAdvisory.yieldPrediction || 'Good harvest expected under recommended practices.'}
                  </p>
                </div>

              </div>

              {/* Market Suggestion */}
              {activeAdvisory.marketSuggestion && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-shopping-cart text-indigo-500 text-base"></i>
                    <h5 className="font-bold text-sm text-[#142B20] dark:text-white">Market & Selling Strategy</h5>
                  </div>
                  <p className="text-xs text-[#617568] dark:text-slate-300 leading-relaxed">
                    {activeAdvisory.marketSuggestion}
                  </p>
                </div>
              )}

              {/* Footer Timestamp Note */}
              <div className="text-[11px] text-[#617568] dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span>Advisory Created: {new Date(activeAdvisory.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span className="font-bold text-[#237A3B] dark:text-[#8FE3A8]">Phoenix AI Engine</span>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-[#142B20] dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(activeAdvisory)}
                disabled={generatingPdf}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#237A3B] to-[#2F8F4E] text-white text-xs font-bold shadow-md hover:from-[#1d6631] hover:to-[#267741] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {generatingPdf ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-file-pdf text-[#8FE3A8]"></i>
                )}
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. OVERLAPPING MODAL 2: PDF PREVIEW MODAL (z-[70])                       */}
      {/* ========================================================================= */}
      {showPdfPreviewModal && (
        <div
          onClick={closePdfPreviewModal}
          className="fixed inset-0 bg-[#142B20]/90 backdrop-blur-md z-[70] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 animate-logo-fade-in overflow-hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-scale-up"
          >
            {/* Preview Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-[#237A3B] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-[#8FE3A8] text-lg">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-white">
                    Preview Advisory PDF
                  </h3>
                  <p className="text-[10px] text-[#DDF5E4] truncate max-w-md">{pdfPreviewFilename}</p>
                </div>
              </div>

              <button
                onClick={closePdfPreviewModal}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close preview"
              >
                <i className="fas fa-xmark text-base"></i>
              </button>
            </div>

            {/* Preview Frame Body */}
            <div className="flex-1 bg-slate-800 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
              {pdfPreviewBlobUrl ? (
                <iframe
                  src={pdfPreviewBlobUrl}
                  title="PDF Preview"
                  className="w-full h-full rounded-xl bg-white border-0 shadow-inner"
                />
              ) : (
                <div className="text-white text-xs font-semibold flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i> Loading PDF document preview…
                </div>
              )}
            </div>

            {/* Preview Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closePdfPreviewModal}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-[#142B20] dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = pdfPreviewBlobUrl;
                  link.download = pdfPreviewFilename || 'AI-Crop-Advisory.pdf';
                  link.click();
                  showToast({
                    title: 'Download Complete',
                    message: 'Your PDF report was downloaded successfully.',
                    type: 'success'
                  });
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#237A3B] to-[#2F8F4E] text-white text-xs font-bold shadow-md hover:from-[#1d6631] hover:to-[#267741] transition-all flex items-center gap-2 cursor-pointer"
              >
                <i className="fas fa-download text-[#8FE3A8]"></i>
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Advisory;
