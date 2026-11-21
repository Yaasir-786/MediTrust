import React from 'react';
import { ShieldCheck, XCircle, CheckCircle2 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const displayValue = (value) => {
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(', ');
    return joined || '—';
  }
  if (value === null || value === undefined || String(value).trim() === '') {
    return '—';
  }
  return value;
};

const formatFee = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toFixed(2)}` : '—';
};

const firstNonEmpty = (...values) =>
  values.find(
    (value) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== '',
  );

export default function VerificationModal({ 
  isOpen, 
  onClose, 
  item, 
  type = 'Doctor',
  onApprove,
  onReject 
}) {
  if (!item) return null;

  const isPathologist = Boolean(item.laboratoryName);
  const facilityLabel = isPathologist ? 'Laboratory' : 'Clinic';
  const facilityName = isPathologist ? item.laboratoryName : item.clinicName;
  const facilityAddress = isPathologist
    ? item.laboratoryAddress
    : item.address;
  const workingHours =
    item.workingHours?.start || item.workingHours?.end
      ? `${displayValue(item.workingHours?.start)} - ${displayValue(item.workingHours?.end)}`
      : '—';
  const applicantName = firstNonEmpty(item.user?.name);
  const applicantEmail = firstNonEmpty(item.email, item.user?.email);
  const applicantPhone = firstNonEmpty(item.phone, item.user?.phone);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Verify ${type} Details`}
      subtitle={`Review the submitted details for ${applicantName ?? 'this applicant'}`}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={onReject || onClose}
            icon={XCircle}
          >
            {item.isVerified ? 'Revoke Verification' : 'Reject Application'}
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={onApprove || onClose}
            icon={CheckCircle2}
          >
            Approve & Verify
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        
        {/* Applicant Summary */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-900 text-sm">
              {displayValue(applicantName)}
            </span>
            <Badge
              variant={item.isVerified ? 'success' : 'warning'}
              size="sm"
            >
              {item.isVerified ? 'Verified' : 'Verification Pending'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            <div>
              <span className="text-slate-400 block">Email:</span>
              <span className="font-semibold text-slate-800 break-words">
                {displayValue(applicantEmail)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Phone:</span>
              <span className="font-semibold text-slate-800">
                {displayValue(applicantPhone)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">{facilityLabel}:</span>
              <span className="font-semibold text-slate-800">
                {displayValue(facilityName)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Address:</span>
              <span className="font-semibold text-slate-800">
                {displayValue(facilityAddress)}
              </span>
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-slate-400 block">Qualification:</span>
            <span className="font-semibold text-slate-800">
              {displayValue(item.qualification)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-slate-400 block">Experience:</span>
            <span className="font-semibold text-slate-800">
              {displayValue(item.experience)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-slate-400 block">Specialization:</span>
            <span className="font-semibold text-slate-800">
              {displayValue(item.specialization)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-slate-400 block">Consultation Fee:</span>
            <span className="font-semibold text-slate-800">
              {formatFee(item.consultationFee)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-slate-400 block">Working Hours:</span>
            <span className="font-semibold text-slate-800">
              {workingHours}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <span className="text-slate-400 block">Working Days:</span>
            <span className="font-semibold text-slate-800">
              {displayValue(item.workingDays)}
            </span>
          </div>
        </div>

        {/* Neutral Note */}
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
          <span>Verification is based on the details submitted in the application.</span>
        </div>

      </div>
    </Modal>
  );
}
