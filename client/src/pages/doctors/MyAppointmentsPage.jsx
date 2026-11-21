import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  XCircle,
  RotateCw,
  Building2,
  Stethoscope,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import LoaderScreen from "../../components/common/Loader";
import doctorService from "../../services/doctorService";
import { logoutUser } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

const TABS = ["All Appointments", "Upcoming", "Cancelled"];

const STATUS_META = {
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "info" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (value) => {
  const n = Number(value ?? 0);
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
};

const specializationText = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value ?? "—";
};

export default function MyAppointmentsPage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("All Appointments");

  const {
    data: appointments = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["my-doctor-appointments", user?.token],
    queryFn: () => doctorService.getMyAppointments(user?.token),
    enabled: !!user?.token,
    retry: false,
  });

  const statusCode = error?.response?.status;
  const isSessionExpired = statusCode === 401;

  useEffect(() => {
    if (isSessionExpired) {
      localStorage.removeItem("user");
      dispatch(logoutUser());
      navigate("/login");
    }
  }, [isSessionExpired, dispatch, navigate]);

  const cancelMutation = useMutation({
    mutationFn: (appointmentId) =>
      doctorService.updateAppointment({
        token: user?.token,
        appointmentId,
        status: "cancelled",
      }),
    onSuccess: () => {
      toast.success("Appointment cancelled.");
      queryClient.invalidateQueries({
        queryKey: ["my-doctor-appointments", user?.token],
      });
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
          "Could not cancel the appointment.",
      );
    },
  });

  const handleCancel = (appointmentId) => {
    if (window.confirm("Cancel this appointment?")) {
      cancelMutation.mutate(appointmentId);
    }
  };

  const normalized = (appointments ?? []).map((apt) => {
    const key = String(apt?.status ?? "pending").toLowerCase();
    const meta = STATUS_META[key] ?? STATUS_META.pending;
    const doctor = apt?.doctor ?? null;
    return {
      _id: apt?._id,
      displayId: apt?._id
        ? `APT-${String(apt._id).slice(-6).toUpperCase()}`
        : "APT-—",
      statusKey: key,
      statusLabel: meta.label,
      statusVariant: meta.variant,
      bookedOn: formatDate(apt?.createdAt),
      doctorName: doctor?.user?.name ?? "Doctor no longer available",
      specialization: specializationText(doctor?.specialization),
      clinicName: doctor?.clinicName ?? "—",
      address: doctor?.address ?? "—",
      fee: Number(doctor?.consultationFee ?? 0),
    };
  });

  const displayedAppointments = normalized.filter((apt) => {
    if (activeTab === "All Appointments") return true;
    if (activeTab === "Upcoming")
      return apt.statusKey === "pending" || apt.statusKey === "confirmed";
    return apt.statusKey === activeTab.toLowerCase();
  });

  if (isLoading) {
    return <LoaderScreen />;
  }

  if (isError && !isSessionExpired) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <Badge variant="info" size="sm" className="mb-1">
            Clinical Care Timeline
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            My Doctor Appointments
          </h1>
        </div>
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Calendar className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Could not load your appointments
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {error?.response?.data?.message ||
                error?.message ||
                "Something went wrong while fetching your appointments."}
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="info" size="sm" className="mb-1">
            Clinical Care Timeline
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            My Doctor Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View your scheduled consultations and track their confirmation
            status.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate("/doctors")}
          icon={Calendar}>
          Book New Consultation
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              {tab}
            </button>
          );
        })}
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {displayedAppointments.length === 0 ? (
          <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
            <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
              <Calendar className="w-10 h-10 stroke-1" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">
                No Appointments
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {normalized.length === 0
                  ? "You haven't booked a doctor consultation yet."
                  : "No appointments match this filter. Try a different status."}
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
        ) : (
          displayedAppointments.map((apt) => (
            <Card
              key={apt._id}
              className="p-6 border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Doctor Info */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                    <Stethoscope className="w-7 h-7 text-slate-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        {apt.displayId}
                      </span>
                      <Badge variant={apt.statusVariant} size="sm" dot>
                        {apt.statusLabel}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {apt.doctorName}
                    </h3>
                    <p className="text-xs font-semibold text-teal-700">
                      {apt.specialization}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {apt.clinicName}
                    </p>
                  </div>
                </div>

                {/* Booked On */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">
                      Booked on
                    </span>
                    <span className="text-xs font-bold text-slate-900 block">
                      {apt.bookedOn}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address & Actions */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {apt.address}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Consultation Fee:{" "}
                    <strong className="text-slate-800">
                      {formatMoney(apt.fee)}
                    </strong>
                  </span>
                </div>

                {(apt.statusKey === "pending" ||
                  apt.statusKey === "confirmed") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    icon={XCircle}
                    onClick={() => handleCancel(apt._id)}
                    disabled={cancelMutation.isPending}>
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
