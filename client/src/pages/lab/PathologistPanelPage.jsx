import React, { useEffect, useState } from "react";
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  Mail,
  Phone,
  ShieldAlert,
  Plus,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import LoaderScreen from "../../components/common/Loader";
import pathologistService from "../../services/pathologistService";
import { logoutUser } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

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

export default function PathologistPanelPage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isPathologist =
    String(user?.userType ?? "").toUpperCase() === "PATHOLOGIST";

  const [testForm, setTestForm] = useState({
    title: "",
    description: "",
    price: "",
  });

  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["pathologist-panel-appointments", user?.token],
    queryFn: () => pathologistService.getLabAppointments(user?.token),
    enabled: !!user?.token && isPathologist,
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
      pathologistService.updateAppointment({
        token: user?.token,
        appointmentId,
        status,
      }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "delivered"
          ? "Booking marked as delivered."
          : "Booking cancelled.",
      );
      queryClient.invalidateQueries({
        queryKey: ["pathologist-panel-appointments", user?.token],
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
          "Could not update the booking.",
      );
    },
  });

  const addTestMutation = useMutation({
    mutationFn: (payload) =>
      pathologistService.addTest({ token: user?.token, payload }),
    onSuccess: () => {
      toast.success("Diagnostic test added to your catalog.");
      setTestForm({ title: "", description: "", price: "" });
      queryClient.invalidateQueries({
        queryKey: ["pathologist-panel-appointments", user?.token],
      });
      queryClient.invalidateQueries({ queryKey: ["items"] });
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
          "Could not add the diagnostic test.",
      );
    },
  });

  const handleAddTest = (e) => {
    e.preventDefault();
    addTestMutation.mutate({
      title: testForm.title.trim(),
      description: testForm.description.trim(),
      price: Number(testForm.price),
    });
  };

  if (!isPathologist) {
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
              Could not load lab bookings
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {error?.response?.data?.message ||
                error?.message ||
                "Something went wrong while fetching lab bookings."}
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
    return {
      _id: booking?._id,
      statusKey: key,
      statusLabel: meta.label,
      statusVariant: meta.variant,
      bookedOn: formatDate(booking?.createdAt),
      patientName: booking?.user?.name ?? "Patient",
      patientEmail: booking?.user?.email ?? "—",
      patientPhone: booking?.user?.phone ?? "—",
      testTitle: test?.title ?? "Test removed",
      testPrice: Number(test?.price ?? 0),
    };
  });

  const pendingCount = normalized.filter(
    (booking) => booking.statusKey === "pending",
  ).length;
  const deliveredCount = normalized.filter(
    (booking) => booking.statusKey === "delivered",
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="warning" size="sm" className="mb-1">
            Lab Panel
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Diagnostic Bookings & Tests
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fulfil patient test bookings and manage your laboratory catalog.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-center">
            <span className="block text-lg font-black text-amber-700">
              {pendingCount}
            </span>
            <span className="text-[11px] text-amber-700/80">Pending</span>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-center">
            <span className="block text-lg font-black text-emerald-700">
              {deliveredCount}
            </span>
            <span className="text-[11px] text-emerald-700/80">Delivered</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bookings list */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Patient Bookings ({normalized.length})
          </h2>

          {normalized.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-slate-200 space-y-4">
              <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <FlaskConical className="w-10 h-10 stroke-1" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-800">
                  No Lab Bookings Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Patient test bookings will appear here once they book one of
                  your diagnostic tests.
                </p>
              </div>
            </Card>
          ) : (
            normalized.map((booking) => (
              <Card
                key={booking._id}
                className="p-6 border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        LAB-{String(booking._id).slice(-6).toUpperCase()}
                      </span>
                      <Badge variant={booking.statusVariant} size="sm" dot>
                        {booking.statusLabel}
                      </Badge>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {booking.testTitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {booking.patientName}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {booking.patientEmail}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {booking.patientPhone}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs text-slate-400 block">
                      Test Fee
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      {formatMoney(booking.testPrice)}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 sm:justify-end mt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {booking.bookedOn}
                    </span>
                  </div>
                </div>

                {booking.statusKey === "pending" && (
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={CheckCircle2}
                      onClick={() =>
                        updateMutation.mutate({
                          appointmentId: booking._id,
                          status: "delivered",
                        })
                      }
                      disabled={updateMutation.isPending}>
                      Mark Delivered
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      icon={XCircle}
                      onClick={() =>
                        updateMutation.mutate({
                          appointmentId: booking._id,
                          status: "cancelled",
                        })
                      }
                      disabled={updateMutation.isPending}>
                      Cancel
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Add test form */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24 space-y-5 border-teal-200/80 shadow-md">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                Add Diagnostic Test
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Publish a new test to the MediTrust lab catalog.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleAddTest}>
              <Input
                label="Test Title"
                name="title"
                value={testForm.title}
                onChange={(e) =>
                  setTestForm({ ...testForm, title: e.target.value })
                }
                required
              />
              <div>
                <label
                  htmlFor="test-description"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="test-description"
                  rows={3}
                  value={testForm.description}
                  onChange={(e) =>
                    setTestForm({ ...testForm, description: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <Input
                label="Price (₹)"
                type="number"
                name="price"
                value={testForm.price}
                onChange={(e) =>
                  setTestForm({ ...testForm, price: e.target.value })
                }
                required
              />

              <Button
                variant="primary"
                size="md"
                type="submit"
                className="w-full justify-center"
                icon={Plus}
                disabled={addTestMutation.isPending}>
                {addTestMutation.isPending ? "Adding Test…" : "Add Test"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
