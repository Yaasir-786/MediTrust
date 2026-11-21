import React, { useEffect, useState } from "react";
import {
  Users,
  Package,
  Stethoscope,
  FlaskConical,
  ShoppingBag,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  MoreVertical,
  ChevronDown,
} from "lucide-react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Sidebar from "../../components/common/Sidebar";
import AddProductModal from "./AddProductModal";
import VerificationModal from "./VerificationModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import LoaderScreen from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import AdminSidebar, { buildAdminCounts } from "../../components/admin/AdminSidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../../features/auth/authSlice";

const ORDER_STATUSES = ["pending", "confirmed", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  let { pathname } = useLocation();
  let currentPath = pathname.split("/")[pathname.split("/").length - 1];

  const { data, isLoading, isSuccess, isError, error } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => adminService.fetchAdminData(user?.token),
    enabled: !!user?.token,
  });

  const [activeSection, setActiveSection] = useState("Order");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [verificationTarget, setVerificationTarget] = useState(null);
  const [trackingTarget, setTrackingTarget] = useState(null);
  const [statusValue, setStatusValue] = useState("pending");

  const updateOrderMutation = useMutation({
    mutationFn: ({ orderId, status }) =>
      adminService.updateOrder({ token: user?.token, orderId, status }),
    onSuccess: () => {
      toast.success("Order status updated.");
      setTrackingTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
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
          "Could not update the order status.",
      );
    },
  });

  const openTracking = (row) => {
    setTrackingTarget(row);
    setStatusValue(row?.status ?? "pending");
  };

  const handleSaveTracking = () => {
    if (!trackingTarget?._id) return;
    updateOrderMutation.mutate({
      orderId: trackingTarget._id,
      status: statusValue,
    });
  };

  useEffect(() => {
    if (isError && error) {
      toast.error(error.response?.data?.message || error.message);
    }
  }, [isError, error, data, isSuccess]);

  if (isLoading) {
    return <LoaderScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <AdminSidebar counts={buildAdminCounts(data)} />

      {/* Main Admin Area */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-x-hidden">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 capitalize">
              {currentPath.toUpperCase()} OVERVIEW
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live hospital operations, verification workflows, and
              pharmaceutical stock control.
            </p>
          </div>

          {/* ADD PRODUCT MODEL
          <div className="flex items-center gap-2">
            {activeSection === "products" && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsAddProductOpen(true)}>
                Add New Product
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}>
              Exit to Patient Portal
            </Button>
          </div> */}
        </div>

        {/* Table Container Card */}
        <Card className="p-6 border-slate-200 shadow-xs space-y-4">
          {/* Table Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${activeSection}...`}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC DATA TABLE BY SECTION */}
          <div className="overflow-x-auto">
            {/* 4. ORDERS TABLE */}
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.orders?.map((row) => (
                  <tr
                    key={row._id}
                    className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {row._id?.slice(-6) ?? row._id}
                    </td>
                    <td className="py-3 px-4">{row.user?.name ?? "—"}</td>
                    <td className="py-3 px-4">{row.product?.name ?? "—"}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {row.product?.price ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          row.status === "delivered" ||
                          row.status === "confirmed"
                            ? "success"
                            : row.status === "cancelled"
                              ? "danger"
                              : "warning"
                        }
                        size="sm"
                        dot>
                        {(row.status ?? "unknown").toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openTracking(row)}
                        className="text-teal-600 font-semibold hover:underline">
                        Update Tracking
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Modal
        isOpen={!!trackingTarget}
        onClose={() => setTrackingTarget(null)}
        title="Update Order Status"
        subtitle={
          trackingTarget
            ? `Order #${String(trackingTarget._id).slice(-6)} · ${
                trackingTarget.product?.name ?? "Product"
              }`
            : undefined
        }
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTrackingTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveTracking}
              disabled={updateOrderMutation.isPending}>
              {updateOrderMutation.isPending ? "Saving…" : "Save Status"}
            </Button>
          </>
        }>
        <div className="space-y-2">
          <label
            htmlFor="order-status"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Fulfillment Status
          </label>
          <select
            id="order-status"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-teal-500">
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
