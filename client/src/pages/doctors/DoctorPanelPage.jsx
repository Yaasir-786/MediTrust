import React, { useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  Mail,
  Phone,
  Stethoscope,
  ShieldAlert,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import LoaderScreen from "../../components/common/Loader";
import doctorService from "../../services/doctorService";
import { logoutUser } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

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

export default function DoctorPanelPage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isDoctor = String(user?.userType ?? "").toUpperCase() === "DOCTOR";

  const {
    data: appointments = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["doctor-panel-appointments", user?.token],
    queryFn: () => doctorService.getDoctorAppointments(user?.token),
    enabled: !!user?.token && isDoctor,
    retry: false,
  });

  const isSessionExpired = error?.response?.status === 401;

  useEffect(() => {
    if (isSessionExpired) {
      localStorage.removeItem("user");
      dispatch(logoutUser());
      navigate("/login");
    }
  }, [isSessionExpired, dispatch, navigate]);

  const updateMutation = useMutation({
    mutationFn: ({ appointmentId, status }) =>
      doctorService.updateAppointment({
        token: user?.token,
        appointmentId,
        status,
      }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "confirmed"
          ? "Appointment confirmed."
          : "Appointment cancelled.",
      );
      queryClient.invalidateQueries({
        queryKey: ["doctor-panel-appointments", user?.token],
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
          "Could not update the appointment.",
      );
    },
  });

  if (!isDoctor) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <LoaderScreen />;
  }

  if (isError && !isSessionExpired) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Could not load appointments
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

  const normalized = (appointments ?? []).map((apt) => {
    const key = String(apt?.status ?? "pending").toLowerCase();
    const meta = STATUS_META[key] ?? STATUS_META.pending;
    return {
      _id: apt?._id,
      statusKey: key,
      statusLabel: meta.label,
      statusVariant: meta.variant,
      bookedOn: formatDate(apt?.createdAt),
      patientName: apt?.user?.name ?? "Patient",
      patientEmail: apt?.user?.email ?? "—",
      patientPhone: apt?.user?.phone ?? "—",
    };
  });

  const pendingCount = normalized.filter(
    (apt) => apt.statusKey === "pending",
  ).length;
  const confirmedCount = normalized.filter(
    (apt) => apt.statusKey === "confirmed",
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="info" size="sm" className="mb-1">
            Doctor Panel
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Patient Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review incoming consultation requests and update their status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-center">
            <span className="block text-lg font-black text-amber-700">
              {pendingCount}
            </span>
            <span className="text-[11px] text-amber-700/80">Pending</span>
          </div>
          <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-2 text-center">
            <span className="block text-lg font-black text-teal-700">
              {confirmedCount}
            </span>
            <span className="text-[11px] text-teal-700/80">Confirmed</span>
          </div>
        </div>
      </div>

      {/* Appointments */}
      <div className="space-y-4">
        {normalized.length === 0 ? (
          <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
            <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
              <Calendar className="w-10 h-10 stroke-1" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">
                No Appointments Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Patient consultation requests will appear here once they book
                with you.
              </p>
            </div>
          </Card>
        ) : (
          normalized.map((apt) => (
            <Card
              key={apt._id}
              className="p-6 border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        APT-{String(apt._id).slice(-6).toUpperCase()}
                      </span>
                      <Badge variant={apt.statusVariant} size="sm" dot>
                        {apt.statusLabel}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {apt.patientName}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {apt.patientEmail}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {apt.patientPhone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-teal-600" />
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

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                {apt.statusKey === "pending" && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() =>
                      updateMutation.mutate({
                        appointmentId: apt._id,
                        status: "confirmed",
                      })
                    }
                    disabled={updateMutation.isPending}>
                    Confirm
                  </Button>
                )}
                {(apt.statusKey === "pending" ||
                  apt.statusKey === "confirmed") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    icon={XCircle}
                    onClick={() =>
                      updateMutation.mutate({
                        appointmentId: apt._id,
                        status: "cancelled",
                      })
                    }
                    disabled={updateMutation.isPending}>
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
