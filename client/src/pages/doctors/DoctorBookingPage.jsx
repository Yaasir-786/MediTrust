import React from "react";
import {
  ShieldCheck,
  Clock,
  MapPin,
  GraduationCap,
  Calendar,
  Building2,
  Phone,
  Mail,
  AlertCircle,
  RotateCw,
  User,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import LoaderScreen from "../../components/common/Loader";
import medicalService from "../../services/medicalService";
import doctorService from "../../services/doctorService";
import { logoutUser } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

const formatMoney = (value) => {
  const n = Number(value ?? 0);
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
};

const specializationText = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value ?? "—";
};

export default function DoctorBookingPage() {
  const { did } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["items"],
    queryFn: medicalService.fetchData,
  });

  const doctor = (data?.doctors ?? []).find((doc) => doc._id === did);

  const bookMutation = useMutation({
    mutationFn: () =>
      doctorService.bookAppointment({ token: user?.token, doctorId: did }),
    onSuccess: () => {
      toast.success("Appointment booked successfully.");
      queryClient.invalidateQueries({
        queryKey: ["my-doctor-appointments", user?.token],
      });
      navigate("/auth/my-appointments");
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
          "Could not book the appointment.",
      );
    },
  });

  const handleConfirm = () => {
    if (!user?.token) {
      navigate("/login");
      return;
    }
    bookMutation.mutate();
  };

  if (isLoading) {
    return <LoaderScreen />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Could not load doctor details
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {error?.response?.data?.message ||
                error?.message ||
                "Something went wrong while fetching the doctor."}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => refetch()}
              icon={RotateCw}
              disabled={isRefetching}>
              {isRefetching ? "Retrying…" : "Retry"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
            <User className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Doctor not found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This specialist is no longer listed on MediTrust.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate("/doctors")}
              icon={Calendar}>
              Browse Doctors
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button onClick={() => navigate("/")} className="hover:text-teal-600">
          Home
        </button>
        <span>/</span>
        <button
          onClick={() => navigate("/doctors")}
          className="hover:text-teal-600">
          Doctors
        </button>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate">
          Book Appointment
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Doctor Profile */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border-2 border-slate-200 flex items-center justify-center">
                <User className="w-12 h-12 text-slate-300" />
                {doctor.isVerified && (
                  <div className="absolute bottom-1.5 right-1.5 bg-teal-600 text-white p-1 rounded-full shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info" size="sm">
                    {specializationText(doctor.specialization)}
                  </Badge>
                  <Badge
                    variant={doctor.isVerified ? "success" : "warning"}
                    size="sm"
                    dot>
                    {doctor.isVerified ? "Verified" : "Verification Pending"}
                  </Badge>
                </div>

                <h1 className="text-2xl font-extrabold text-slate-900">
                  {doctor?.user?.name ?? "Doctor"}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {doctor.address}
                </p>
                <p className="text-xs text-slate-600 pt-2 leading-relaxed">
                  {doctor.experience} years of clinical experience •{" "}
                  {doctor.qualification}
                </p>
              </div>
            </div>
          </Card>

          {/* Clinic & Contact */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              Clinic & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Clinic</span>
                  <span>{doctor.clinicName}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Address
                  </span>
                  <span>{doctor.address}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Phone</span>
                  <span>{doctor.phone || "—"}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Email</span>
                  <span>{doctor.email || "—"}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Availability */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Consultation Schedule
            </h3>

            <div className="rounded-xl bg-teal-50/70 border border-teal-100 p-4 text-xs text-teal-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Working hours
              </span>
              <strong className="font-bold">
                {doctor.workingHours?.start} - {doctor.workingHours?.end}
              </strong>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-2">
                Working days
              </span>
              <div className="flex flex-wrap gap-2">
                {(doctor.workingDays ?? []).length === 0 ? (
                  <span className="text-xs text-slate-400">Not specified</span>
                ) : (
                  doctor.workingDays.map((day) => (
                    <Badge key={day} variant="neutral" size="sm">
                      {day}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Qualification */}
          <Card className="p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-teal-600" />
              Qualification
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {doctor.qualification}
            </p>
          </Card>
        </div>

        {/* Right 4 Cols: Booking Summary */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 sticky top-24 border-teal-200/90 shadow-lg space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">
                Appointment Summary
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Please review your consultation details
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-semibold text-slate-800 text-right">
                  {doctor?.user?.name ?? "Doctor"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Specialty:</span>
                <span className="font-semibold text-teal-700 text-right">
                  {specializationText(doctor.specialization)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Clinic:</span>
                <span className="font-semibold text-slate-800 text-right">
                  {doctor.clinicName}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-slate-100 py-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Doctor Consultation Fee</span>
                <span>{formatMoney(doctor.consultationFee)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                <span>Total Payable</span>
                <span className="text-teal-700 text-base">
                  {formatMoney(doctor.consultationFee)}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md shadow-teal-600/25"
              onClick={handleConfirm}
              disabled={bookMutation.isPending}>
              {bookMutation.isPending
                ? "Booking Appointment…"
                : "Confirm & Book Appointment"}
            </Button>

            <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
                Appointment Status
              </div>
              <p>
                Your booking will be sent to the doctor as pending until it is
                confirmed.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
