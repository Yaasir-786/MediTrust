import React, { useState } from "react";
import {
  Check,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import doctorService from "../../services/doctorService";
import { logoutUser } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

const STEPS = [
  { id: 1, name: "Contact & Clinic", desc: "Identity & Contacts" },
  { id: 2, name: "Qualification & Specialty", desc: "Practice & Experience" },
  { id: 3, name: "Availability", desc: "Working Hours & Days" },
];

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function DoctorApplicationPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    clinicName: "",
    address: "",
    qualification: "",
    specialization: "Cardiology",
    experience: "",
    consultationFee: "",
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    workingDays: [],
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((item) => item !== day)
        : [...prev.workingDays, day],
    }));
  };

  const applyMutation = useMutation({
    mutationFn: (payload) =>
      doctorService.applyAsDoctor({ token: user?.token, payload }),
    onSuccess: () => {
      toast.success("Application submitted for verification.");
      setIsSubmitted(true);
    },
    onError: (err) => {
      if (err?.response?.status === 401) {
        localStorage.removeItem("user");
        dispatch(logoutUser());
        navigate("/login");
        return;
      }
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Could not submit the application.",
      );
    },
  });

  const handleSubmit = () => {
    const requiredFields = [
      formData.clinicName.trim(),
      formData.address.trim(),
      formData.email.trim(),
      formData.phone.trim(),
      formData.qualification.trim(),
      String(formData.experience).trim(),
      String(formData.consultationFee).trim(),
    ];

    if (
      requiredFields.some((value) => !value) ||
      formData.workingDays.length === 0
    ) {
      toast.error("Please fill all the details.");
      return;
    }

    applyMutation.mutate({
      clinicName: formData.clinicName.trim(),
      address: formData.address.trim(),
      experience: formData.experience,
      qualification: formData.qualification.trim(),
      specialization: formData.specialization,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      consultationFee: Number(formData.consultationFee),
      workingHours: {
        start: formData.workingHoursStart,
        end: formData.workingHoursEnd,
      },
      workingDays: formData.workingDays,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <Badge variant="info" size="sm">
          Physician Enrollment Portal
        </Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Join MediTrust as a Verified Doctor
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Offer virtual telehealth consultations, manage your patient records
          securely, and expand your clinical practice.
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                type="button"
                className={`text-left p-2 rounded-xl transition-colors ${
                  isCurrent
                    ? "bg-teal-50/80 border border-teal-200"
                    : "hover:bg-slate-50"
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? "bg-teal-600 text-white"
                        : isCurrent
                          ? "bg-teal-600 text-white ring-2 ring-teal-200"
                          : "bg-slate-100 text-slate-500"
                    }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  <span
                    className={`text-xs font-bold ${isCurrent ? "text-teal-900" : "text-slate-700"}`}>
                    {s.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pl-8 hidden sm:block">
                  {s.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Form Content */}
      <Card className="p-8 shadow-sm">
        {isSubmitted ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Application Submitted for Verification
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Thank you for applying to the MediTrust Clinical Network. Our
              medical verification board will review your submitted details
              within 24 to 48 hours.
            </p>
            <div className="pt-4">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate("/")}>
                Return to Homepage
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Step 1: Contact & Clinic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Professional Email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    icon={Mail}
                    required
                  />
                  <Input
                    label="Direct Mobile Phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    icon={Phone}
                    required
                  />
                </div>
                <Input
                  label="Clinic or Hospital Affiliation"
                  name="clinicName"
                  value={formData.clinicName}
                  onChange={handleChange}
                  icon={Building}
                  required
                />
                <Input
                  label="Clinic Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Step 2: Qualification, Specialty & Experience
                </h3>
                <Input
                  label="Medical Qualification (e.g. MBBS, MD)"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Primary Medical Specialty *
                  </label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500">
                    <option>Cardiology</option>
                    <option>Dermatology</option>
                    <option>Pediatrics</option>
                    <option>General Medicine</option>
                    <option>Neurology</option>
                    <option>Orthopedics</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Years of Active Clinical Practice"
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Standard Consultation Fee (₹)"
                    type="number"
                    name="consultationFee"
                    value={formData.consultationFee}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Step 3: Availability
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Working Hours Start"
                    type="time"
                    name="workingHoursStart"
                    value={formData.workingHoursStart}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Working Hours End"
                    type="time"
                    name="workingHoursEnd"
                    value={formData.workingHoursEnd}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Working Days *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {WEEKDAYS.map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 text-xs font-medium cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formData.workingDays.includes(day)}
                          onChange={() => toggleDay(day)}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  icon={ArrowLeft}>
                  Previous Step
                </Button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  icon={ArrowRight}
                  iconPosition="right">
                  Continue to Step {currentStep + 1}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSubmit}
                  icon={ShieldCheck}
                  disabled={applyMutation.isPending}>
                  {applyMutation.isPending
                    ? "Submitting…"
                    : "Submit Application for Verification"}
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
