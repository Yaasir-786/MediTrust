import React, { useEffect } from "react";
import {
  FlaskConical,
  Clock,
  MapPin,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import LoaderScreen from "../../components/common/Loader";
import pathologistService from "../../services/pathologistService";
import { logoutUser } from "../../features/auth/authSlice";

const STATUS_META = {
  pending: { label: "Pending", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
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

export default function MyLabAppointmentsPage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["my-lab-appointments", user?.token],
    queryFn: () => pathologistService.getMyAppointments(user?.token),
    enabled: !!user?.token,
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

  if (isLoading) {
    return <LoaderScreen />;
  }

  if (isError && !isSessionExpired) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <Badge variant="warning" size="sm" className="mb-1">
            Diagnostic Health History
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            My Lab Test Appointments
          </h1>
        </div>
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <FlaskConical className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Could not load your lab bookings
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {error?.response?.data?.message ||
                error?.message ||
                "Something went wrong while fetching your lab bookings."}
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

  const normalized = (bookings ?? []).map((booking) => {
    const key = String(booking?.status ?? "pending").toLowerCase();
    const meta = STATUS_META[key] ?? STATUS_META.pending;
    const test = booking?.pathologyTest ?? null;
    const lab = booking?.pathologist ?? null;
    return {
      _id: booking?._id,
      displayId: booking?._id
        ? `LAB-${String(booking._id).slice(-6).toUpperCase()}`
        : "LAB-—",
      statusLabel: meta.label,
      statusVariant: meta.variant,
      bookedOn: formatDate(booking?.createdAt),
      testTitle: test?.title ?? "Test no longer available",
      testDescription: test?.description ?? "",
      price: Number(test?.price ?? 0),
      labName: lab?.laboratoryName ?? "—",
      labAddress: lab?.laboratoryAddress ?? "—",
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="warning" size="sm" className="mb-1">
            Diagnostic Health History
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            My Lab Test Appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your diagnostic test bookings and their fulfillment status.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate("/lab")}
          icon={FlaskConical}>
          Book Another Test
        </Button>
      </div>

      {/* Bookings List */}
      <div className="space-y-6">
        {normalized.length === 0 ? (
          <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <FlaskConical className="w-10 h-10 stroke-1" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">
                No Lab Bookings Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven't booked any diagnostic lab tests yet.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate("/lab")}
                icon={FlaskConical}>
                Browse Lab Tests
              </Button>
            </div>
          </Card>
        ) : (
          normalized.map((booking) => (
            <Card
              key={booking._id}
              className="p-6 border-slate-200 shadow-xs space-y-5">
              {/* Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-400 font-mono">
                      {booking.displayId}
                    </span>
                    <Badge variant={booking.statusVariant} size="sm" dot>
                      {booking.statusLabel}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                    {booking.testTitle}
                  </h3>
                  {booking.testDescription && (
                    <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                      {booking.testDescription}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 block">
                    Test Fee
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {formatMoney(booking.price)}
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Laboratory
                    </span>
                    <span>{booking.labName}</span>
                    <span className="block text-slate-400">
                      {booking.labAddress}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Booked on
                    </span>
                    <span>{booking.bookedOn}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>NABL & ISO 15189 Quality Assured</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
