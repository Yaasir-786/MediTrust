import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  Scan,
  AlertTriangle,
  Clock,
  Pill,
  X,
  RefreshCw,
  ImagePlus,
  CheckCircle2,
  XCircle,
  Search
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import aiService from '../../services/aiService';
import { logoutUser } from '../../features/auth/authSlice';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const isUnclear = (value) =>
  value === null || value === undefined || String(value).trim() === '';

export default function PrescriptionExplainerPage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [result, setResult] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateFile = (candidate) => {
    if (!candidate) return 'Please choose an image file.';
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      return 'Unsupported file type. Use JPG, JPEG, PNG, or WEBP.';
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      return `File is too large. Keep it under ${MAX_SIZE_MB}MB.`;
    }
    return '';
  };

  const handleSelectFile = (candidate) => {
    const problem = validateFile(candidate);
    setValidationError(problem);
    if (problem) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(candidate);
    setPreviewUrl(URL.createObjectURL(candidate));
    setScanError('');
    setResult(null);
    setAvailability(null);
    setAvailabilityError('');
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    setValidationError('');
    setScanError('');
    setResult(null);
    setAvailability(null);
    setAvailabilityError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    const problem = validateFile(file);
    if (problem) {
      setValidationError(problem);
      return;
    }
    setIsScanning(true);
    setScanError('');
    setAvailability(null);
    setAvailabilityError('');
    try {
      const prescription = await aiService.scanPrescription({
        file,
        token: user?.token,
      });
      setResult(prescription);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('user');
        dispatch(logoutUser());
        navigate('/login');
        return;
      }
      setResult(null);
      setScanError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          err?.response?.data?.message ||
          err?.message ||
          'Could not analyze the prescription.',
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleCheckAvailability = async () => {
    if (!result?._id) return;
    setIsCheckingAvailability(true);
    setAvailabilityError('');
    try {
      const data = await aiService.findMedicines({
        prescriptionId: result._id,
        token: user?.token,
      });
      setAvailability(data);
    } catch (err) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('user');
        dispatch(logoutUser());
        navigate('/login');
        return;
      }
      setAvailability(null);
      setAvailabilityError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          err?.response?.data?.message ||
          err?.message ||
          'Could not check medicine availability.',
      );
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const productIdFor = (name) => {
    if (!name) return null;
    const match = (availability?.products ?? []).find(
      (product) => product?.name === name,
    );
    return match?._id ?? null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="purple" size="sm">
          Vision OCR & Clinical Parser
        </Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          AI Prescription Explainer
        </h1>
        <p className="text-sm text-slate-600">
          Upload any handwritten doctor's slip or clinic discharge summary. Our medical vision model deciphers medication schedules, food instructions, and safety precautions.
        </p>
      </div>

      {/* Upload Zone & Scan State */}
      <Card className="p-8 border-dashed border-2 border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 text-center transition-all">

        {isScanning ? (
          /* Animated Scanning State */
          <div className="py-10 space-y-4 max-w-md mx-auto animate-pulse">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Scan className="w-10 h-10 animate-spin" />
              </div>
              <div className="absolute inset-0 border-2 border-indigo-400 rounded-2xl animate-ping" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-indigo-950">
                Scanning Doctor's Handwriting...
              </h3>
              <p className="text-xs text-indigo-700/80">
                Running optical character recognition and matching against FDA pharmacopeia database...
              </p>
            </div>

            <div className="w-48 bg-indigo-200 rounded-full h-1.5 mx-auto overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        ) : (
          /* Dropzone */
          <div
            className="py-6 space-y-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer?.files?.[0]) handleSelectFile(e.dataTransfer.files[0]);
            }}
          >
            {previewUrl ? (
              <div className="max-w-sm mx-auto space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-indigo-200 shadow-sm">
                  <img
                    src={previewUrl}
                    alt="Selected prescription preview"
                    className="w-full max-h-72 object-contain bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-slate-600 hover:text-rose-600 shadow"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 truncate">{file?.name}</p>
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {previewUrl ? 'Prescription Image Ready' : "Drag & Drop Your Prescription Image"}
              </h3>
              <p className="text-xs text-slate-400">
                Supports JPG, JPEG, PNG, WEBP up to {MAX_SIZE_MB}MB. Clear lighting produces best accuracy.
              </p>
            </div>

            {validationError && (
              <p className="text-xs font-semibold text-rose-600">{validationError}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleSelectFile(e.target.files[0]);
              }}
            />

            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              {!previewUrl && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  icon={ImagePlus}
                >
                  Choose Image
                </Button>
              )}
              {previewUrl && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  icon={RefreshCw}
                >
                  Replace Image
                </Button>
              )}
              <Button
                variant="ai"
                size="md"
                onClick={handleAnalyze}
                disabled={!file || isScanning}
                icon={Sparkles}
              >
                Analyze Prescription
              </Button>
            </div>
          </div>
        )}

      </Card>

      {/* Error State */}
      {scanError && !isScanning && (
        <Card className="p-6 text-center space-y-3 border-rose-200">
          <p className="text-sm font-semibold text-rose-700">
            Could not analyze this prescription
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{scanError}</p>
          <Button variant="outline" size="sm" onClick={handleAnalyze} icon={RefreshCw}>
            Retry Analysis
          </Button>
        </Card>
      )}

      {/* Extracted Results Section (actual backend response fields only) */}
      {result && !isScanning && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* Metadata Strip */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 font-bold">
                  RX-{String(result._id ?? '').slice(-6).toUpperCase()}
                </span>
                <Badge variant="success" size="sm" dot>
                  AI Extracted
                </Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Prescribed by: {isUnclear(result.doctor_name) ? 'Unclear — please verify' : result.doctor_name}
              </h3>
              <p className="text-xs text-slate-500">
                Patient: {isUnclear(result.patient_name) ? 'Unclear — please verify' : result.patient_name}
                {' • '}Date: {isUnclear(result.date) ? 'Unclear — please verify' : result.date}
              </p>
              {result.diagnosis_notes && (
                <p className="text-xs text-teal-700 font-medium mt-1">
                  Notes: {result.diagnosis_notes}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pharmacy')}
              icon={Pill}
            >
              Order Medicines via Pharmacy
            </Button>
          </div>

          {/* Scanned image reference */}
          {result.image && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <FileText className="w-4 h-4 text-teal-600 shrink-0" />
              <a
                href={result.image}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-teal-700 hover:underline truncate"
              >
                View scanned prescription image
              </a>
            </div>
          )}

          {/* Cards for each extracted medicine */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Extracted Medications ({(result.medicines ?? []).length})
            </h3>

            {(result.medicines ?? []).length === 0 && (
              <Card className="p-6 text-center">
                <p className="text-xs text-slate-500">
                  No medicines could be read clearly from this image. Try a sharper photo with better lighting.
                </p>
              </Card>
            )}

            {(result.medicines ?? []).map((med, index) => (
              <Card key={index} className="p-6 border-slate-200 shadow-xs space-y-4">

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {isUnclear(med?.name) ? 'Unclear medicine — please verify' : med.name}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Dosage & Schedule
                    </span>
                    <p className="text-xs font-medium text-slate-800 flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                      Dosage: {isUnclear(med?.dosage) ? 'Unclear — please verify' : med.dosage}
                    </p>
                    <div className="text-[11px] text-slate-500 pt-1 space-y-0.5">
                      <p>Frequency: {isUnclear(med?.frequency) ? 'Unclear — please verify' : med.frequency}</p>
                      <p>Duration: {isUnclear(med?.duration) ? 'Unclear — please verify' : med.duration}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1 md:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Pharmacist Notes & Uncertainty Flags
                    </span>
                    {isUnclear(med?.notes) ? (
                      <p className="text-xs text-slate-500">
                        No additional notes extracted for this medicine.
                      </p>
                    ) : (
                      <p className="text-xs text-amber-900 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        {med.notes}
                      </p>
                    )}
                  </div>

                </div>

              </Card>
            ))}
          </div>

          {/* Live pharmacy & lab availability check */}
          <Card className="p-6 border-indigo-200/80 bg-indigo-50/20 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-600" />
                  Pharmacy Availability
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Match these medicines against live pharmacy stock and find labs for any diagnostic tests.
                </p>
              </div>
              <Button
                variant="ai"
                size="sm"
                onClick={handleCheckAvailability}
                disabled={isCheckingAvailability || !result?._id}
                icon={Search}
              >
                {isCheckingAvailability
                  ? 'Checking…'
                  : availability
                    ? 'Re-check Availability'
                    : 'Check Availability'}
              </Button>
            </div>

            {availabilityError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {availabilityError}
              </div>
            )}

            {availability && (
              <div className="space-y-4">
                {availability.summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: 'Prescribed',
                        value: availability.summary.total_medicines_prescribed,
                      },
                      {
                        label: 'Available',
                        value: availability.summary.medicines_available,
                      },
                      {
                        label: 'Unavailable',
                        value: availability.summary.medicines_unavailable,
                      },
                      {
                        label: 'Tests',
                        value: availability.summary.tests_prescribed,
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl bg-white border border-slate-200 p-3 text-center">
                        <span className="block text-lg font-black text-slate-900">
                          {stat.value ?? 0}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(availability.medicines ?? []).length > 0 && (
                  <div className="space-y-2">
                    {(availability.medicines ?? []).map((med, index) => {
                      const productId = productIdFor(med.matched_product_name);
                      return (
                        <div
                          key={`${med.prescribed_name}-${index}`}
                          className="rounded-xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {med.available ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                              )}
                              <span className="text-sm font-bold text-slate-900">
                                {med.prescribed_name}
                              </span>
                              <Badge
                                variant={med.available ? 'success' : 'danger'}
                                size="sm">
                                {med.available ? 'Available' : 'Unavailable'}
                              </Badge>
                              {med.match_confidence && (
                                <Badge variant="neutral" size="sm">
                                  {String(med.match_confidence).toUpperCase()} MATCH
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {med.reason}
                            </p>
                            {med.matched_product_name &&
                              med.matched_product_name !==
                                med.prescribed_name && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Matched: {med.matched_product_name}
                                </p>
                              )}
                          </div>

                          <div className="flex items-center gap-3 text-xs shrink-0">
                            {med.price != null && (
                              <span className="font-bold text-slate-900">
                                ₹{Number(med.price).toFixed(2)}
                              </span>
                            )}
                            {med.stock != null && (
                              <span className="text-slate-500">
                                Stock: {med.stock}
                              </span>
                            )}
                            {productId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/pharmacy/${productId}`)}>
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(availability.tests ?? []).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Diagnostic Tests
                    </h4>
                    {availability.tests.map((test, index) => (
                      <div
                        key={`${test.prescribed_test}-${index}`}
                        className="rounded-xl bg-white border border-slate-200 p-4 space-y-2">
                        <span className="text-sm font-bold text-slate-900">
                          {test.prescribed_test}
                        </span>
                        {(test.available_labs ?? []).length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No laboratory offering this test was found.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {test.available_labs.map((lab, labIndex) => (
                              <div
                                key={`${lab.laboratoryName}-${labIndex}`}
                                className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
                                <span className="font-bold text-slate-800 block">
                                  {lab.laboratoryName}
                                </span>
                                <span className="text-slate-500 block">
                                  {lab.laboratoryAddress}
                                </span>
                                <span className="text-slate-600 block mt-1">
                                  Fee: ₹
                                  {Number(
                                    lab.consultationFee ?? 0,
                                  ).toFixed(2)}
                                </span>
                                {(lab.availableDays ?? []).length > 0 && (
                                  <span className="text-slate-500 block">
                                    {lab.availableDays.join(', ')}
                                  </span>
                                )}
                                {lab.workingHours?.start && (
                                  <span className="text-slate-500 block">
                                    {lab.workingHours.start} -{' '}
                                    {lab.workingHours.end}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="rounded-xl bg-slate-100 p-4 text-xs text-slate-500 text-center">
            MediTrust AI extraction is an assistive readout. Always double-check dosage instructions with the packaging label and your pharmacist.
          </div>

        </div>
      )}

    </div>
  );
}
