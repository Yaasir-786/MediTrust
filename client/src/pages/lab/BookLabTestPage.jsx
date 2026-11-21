import React from "react";
import {
  FlaskConical,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  Calendar,
  Building2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import LoaderScreen from "../../components/common/Loader";
import medicalService from "../../services/medicalService";
import pathologistService from "../../services/pathologistService";
import { logoutUser } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

const formatMoney = (value) => {
  const n = Number(value ?? 0);
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
};

export default function BookLabTestPage() {
  const { tid } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["items"],
    queryFn: medicalService.fetchData,
  });

  const test = (data?.tests ?? []).find((item) => item._id === tid);
  const lab = test?.pathologist ?? null;

  const bookMutation = useMutation({
    mutationFn: () =>
      pathologistService.bookTest({
        token: user?.token,
        pathologistId: lab?._id,
        testId: test?._id,
      }),
    onSuccess: () => {
      toast.success("Lab test booked successfully.");
      queryClient.invalidateQueries({
        queryKey: ["my-lab-appointments", user?.token],
      });
      navigate("/auth/my-lab-appointments");
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
          "Could not book the lab test.",
      );
    },
  });

  const handleConfirm = () => {
    if (!user?.token) {
      navigate("/login");
      return;
    }
    if (!lab?._id) {
      toast.error("This test is not linked to a laboratory.");
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
            <FlaskConical className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Could not load the lab test
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {error?.response?.data?.message ||
                error?.message ||
                "Something went wrong while fetching the test."}
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

  if (!test) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <FlaskConical className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Test not found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This diagnostic test is no longer available.
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
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button onClick={() => navigate("/")} className="hover:text-teal-600">
          Home
        </button>
        <span>/</span>
        <button onClick={() => navigate("/lab")} className="hover:text-teal-600">
          Lab Tests
        </button>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate">
          Book Test
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Test Header Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="info" size="sm" className="mb-2">
                  Diagnostic Test
                </Badge>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {test.title}
                </h1>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {test.description}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-teal-700">
                  {formatMoney(test.price)}
                </span>
              </div>
            </div>
          </Card>

          {/* Laboratory Details */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              Laboratory Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <FlaskConical className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Laboratory
                  </span>
                  <span>{lab?.laboratoryName ?? "—"}</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Address
                  </span>
                  <span>{lab?.laboratoryAddress ?? "—"}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Availability */}
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              Laboratory Schedule
            </h3>

            <div className="rounded-xl bg-teal-50/70 border border-teal-100 p-4 text-xs text-teal-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Working hours
              </span>
              <strong className="font-bold">
                {lab?.workingHours?.start} - {lab?.workingHours?.end}
              </strong>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-2">
                Working days
              </span>
              <div className="flex flex-wrap gap-2">
                {(lab?.workingDays ?? []).length === 0 ? (
                  <span className="text-xs text-slate-400">Not specified</span>
                ) : (
                  lab.workingDays.map((day) => (
                    <Badge key={day} variant="neutral" size="sm">
                      {day}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </Card>

          <div className="rounded-xl bg-amber-50/60 p-3.5 border border-amber-200/70 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900">
              <span className="font-bold">Note: </span>
              Collection date and time slots are arranged directly with the
              laboratory after your booking is confirmed.
            </div>
          </div>
        </div>

        {/* Right: Booking Summary Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 sticky top-24 border-teal-200/90 shadow-lg space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Lab Booking Summary
              </h3>
              <p className="text-xs text-slate-500">
                Accredited diagnostic report delivery
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Selected Test:</span>
                <span className="font-semibold text-slate-800 text-right max-w-[180px] truncate">
                  {test.title}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Laboratory:</span>
                <span className="font-semibold text-slate-800 text-right max-w-[180px] truncate">
                  {lab?.laboratoryName ?? "—"}
                </span>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="border-t border-b border-slate-100 py-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Test Package Price</span>
                <span>{formatMoney(test.price)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                <span>Total Amount</span>
                <span className="text-teal-700 text-base">
                  {formatMoney(test.price)}
                </span>
              </div>
            </div>

            {/* Confirm CTA */}
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md shadow-teal-600/25"
              onClick={handleConfirm}
              disabled={bookMutation.isPending}>
              {bookMutation.isPending
                ? "Booking Lab Test…"
                : "Confirm Lab Booking"}
            </Button>

            <div className="space-y-2 text-[11px] text-slate-500 pt-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>NABL ISO 15189 Certified Pathology</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Reports digitally synced to profile</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
