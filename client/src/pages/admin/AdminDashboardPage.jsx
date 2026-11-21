import React, { useEffect, useState } from "react";
import {
  Users,
  Stethoscope,
  ShoppingBag,
  IndianRupee,
  Search,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import AddProductModal from "./AddProductModal";
import VerificationModal from "./VerificationModal";
import adminService from "../../services/adminService";
import toast from "react-hot-toast";
import LoaderScreen from "../../components/common/Loader";
import AdminSidebar, { buildAdminCounts } from "../../components/admin/AdminSidebar";
import { logoutUser } from "../../features/auth/authSlice";

const AVAILABILITY_FILTERS = [
  { id: "all", label: "All Products" },
  { id: "in-stock", label: "In Stock" },
  { id: "out-of-stock", label: "Out of Stock" },
  { id: "inactive", label: "Inactive" },
];

// Orders with these statuses are not counted as revenue.
const NON_REVENUE_STATUSES = ["cancelled"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const formatRevenue = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Orders store only a product reference (single unit), so the amount is the
// populated product's price.
const orderAmount = (order) => Number(order?.product?.price ?? 0) || 0;

const monthIndexOf = (value) => {
  const date = new Date(value);
  return date.getFullYear() * 12 + date.getMonth();
};

// Percent change from previous to current, or null when there is no baseline.
const percentLabel = (current, previous) => {
  if (!(previous > 0)) return null;
  const percent = ((current - previous) / previous) * 100;
  return `${percent >= 0 ? "+" : "-"}${Math.abs(percent).toFixed(1)}%`;
};

export default function AdminDashboardPage({ onNavigate }) {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeSection] = useState("products");
  const [searchText, setSearchText] = useState("");
  const [availability, setAvailability] = useState("all");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verificationTarget, setVerificationTarget] = useState(null);

  const go = (route, legacyId) => {
    if (typeof onNavigate === "function" && legacyId) {
      try {
        onNavigate(legacyId);
      } catch {
        // ignore legacy demo navigator errors
      }
    }
    navigate(route);
  };

  const { data, isLoading, isSuccess, isError, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => adminService.fetchAdminData(user?.token),
    enabled: !!user?.token,
  });

  const handleAuthError = (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("user");
      dispatch(logoutUser());
      navigate("/login");
      return true;
    }
    return false;
  };

  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    // Keep the public Pharmacy catalog in sync with the latest saved data.
    queryClient.invalidateQueries({ queryKey: ["items"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (productId) =>
      adminService.deleteProduct({ token: user?.token, productId }),
    onSuccess: (result) => {
      toast.success(
        result?.message ||
          (result?.softDeleted
            ? "Product deactivated to preserve order history."
            : "Product deleted successfully."),
      );
      setDeletingProduct(null);
      refreshProducts();
    },
    onError: (err) => {
      if (handleAuthError(err)) return;
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Could not delete the product.",
      );
    },
    onSettled: () => setIsDeleting(false),
  });

  const verifiedDoctors =
    data?.doctors?.filter((doc) => doc.isVerified).length ?? 0;
  const verifiedPathologists =
    data?.pathologists?.filter((path) => path.isVerified).length ?? 0;
  const totalOrders = data?.orders?.length ?? 0;

  const now = new Date();
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekAgo = new Date(now.getTime() - WEEK_MS);

  // Total Revenue: sum of product prices of non-cancelled orders.
  const revenueOrders = (data?.orders ?? []).filter(
    (order) => !NON_REVENUE_STATUSES.includes(order?.status),
  );
  const totalRevenue = revenueOrders.reduce(
    (sum, order) => sum + orderAmount(order),
    0,
  );
  const revenueForMonth = (monthsAgo) =>
    revenueOrders.reduce(
      (sum, order) =>
        monthIndexOf(order?.createdAt) === currentMonthIndex - monthsAgo
          ? sum + orderAmount(order)
          : sum,
      0,
    );
  const thisMonthRevenue = revenueForMonth(0);
  const revenuePercent = percentLabel(thisMonthRevenue, revenueForMonth(1));
  let revenueChange = "No sales yet this month";
  if (revenuePercent) {
    revenueChange = `${revenuePercent} vs last month`;
  } else if (thisMonthRevenue > 0) {
    revenueChange = `${formatRevenue(thisMonthRevenue)} this month`;
  }

  // Total Orders: orders created this month vs last month.
  const ordersForMonth = (monthsAgo) =>
    (data?.orders ?? []).filter(
      (order) =>
        monthIndexOf(order?.createdAt) === currentMonthIndex - monthsAgo,
    ).length;
  const thisMonthOrders = ordersForMonth(0);
  const ordersPercent = percentLabel(thisMonthOrders, ordersForMonth(1));
  let ordersChange = "No orders yet this month";
  if (ordersPercent) {
    ordersChange = `${ordersPercent} vs last month`;
  } else if (thisMonthOrders > 0) {
    ordersChange = `${thisMonthOrders} new this month`;
  }

  // Verified doctors / pathologists: the backend has no "verifiedAt" field and
  // only the admin verification action modifies these records, so `updatedAt`
  // of a verified record is its last verification time.
  const verifiedThisWeek = (list) =>
    (list ?? []).filter(
      (item) => item?.isVerified && new Date(item?.updatedAt) >= weekAgo,
    ).length;
  const doctorsThisWeek = verifiedThisWeek(data?.doctors);
  const doctorsChange =
    doctorsThisWeek > 0
      ? `+${doctorsThisWeek} verified this week`
      : "No new verifications this week";
  const pathologistsThisWeek = verifiedThisWeek(data?.pathologists);
  const pathologistsChange =
    pathologistsThisWeek > 0
      ? `+${pathologistsThisWeek} verified this week`
      : "No new verifications this week";

  // Registered users: growth of the user base since 1 January.
  const allUsers = data?.users ?? [];
  const usersThisYear = allUsers.filter(
    (u) => new Date(u?.createdAt) >= yearStart,
  ).length;
  const usersBeforeThisYear = allUsers.filter(
    (u) => new Date(u?.createdAt) < yearStart,
  ).length;
  let usersChange = "No users yet";
  if (usersBeforeThisYear > 0) {
    usersChange = `+${((usersThisYear / usersBeforeThisYear) * 100).toFixed(1)}% year-to-date`;
  } else if (usersThisYear > 0) {
    usersChange = `${usersThisYear} joined this year`;
  }

  const dashboardStats = [
    {
      id: "revenue",
      label: "Total Revenue",
      value: formatRevenue(totalRevenue),
      change: revenueChange,
      icon: IndianRupee,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      id: "orders",
      label: "Total Orders",
      value: totalOrders,
      change: ordersChange,
      icon: ShoppingBag,
      color: "text-teal-600 bg-teal-50",
    },
    {
      id: "doctors",
      label: "Verified Doctors",
      value: verifiedDoctors,
      change: doctorsChange,
      icon: Stethoscope,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      id: "pathologists",
      label: "Verified Pathologists",
      value: verifiedPathologists,
      change: pathologistsChange,
      icon: Stethoscope,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      id: "users",
      label: "Total Registered Users",
      value: data?.users?.length ?? 0,
      change: usersChange,
      icon: Users,
      color: "text-sky-600 bg-sky-50",
    },
  ];

  useEffect(() => {
    if (isError && error) {
      if (handleAuthError(error)) return;
      toast.error(error.response?.data?.message || error.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, error, data, isSuccess]);

  const handleSaved = (saved) => {
    toast.success(
      saved?._id && editingProduct
        ? "Product updated successfully."
        : "Product added to catalog.",
    );
    setIsAddProductOpen(false);
    setEditingProduct(null);
    refreshProducts();
  };

  const handleConfirmDelete = () => {
    if (!deletingProduct || isDeleting) return;
    setIsDeleting(true);
    deleteMutation.mutate(deletingProduct._id);
  };

  if (isLoading) {
    return <LoaderScreen />;
  }

  const allProducts = data?.products ?? [];
  const filteredProducts = allProducts.filter((row) => {
    const matchesSearch =
      !searchText.trim() ||
      String(row.name ?? "")
        .toLowerCase()
        .includes(searchText.trim().toLowerCase());
    if (!matchesSearch) return false;
    if (availability === "in-stock")
      return row.isActive !== false && Number(row.stock ?? 0) > 0;
    if (availability === "out-of-stock")
      return row.isActive !== false && Number(row.stock ?? 0) <= 0;
    if (availability === "inactive") return row.isActive === false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar counts={buildAdminCounts(data)} />

      {/* Main Admin Area */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-x-hidden">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 capitalize">
              ADMIN OVERVIEW
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live hospital operations, verification workflows, and
              pharmaceutical stock control.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeSection === "products" && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddProductOpen(true);
                }}>
                Add New Product
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => go("/", "landing")}>
              Exit to Patient Portal
            </Button>
          </div>
        </div>

        {/* Top 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {dashboardStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.id} className="p-5 border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {stat.label}
                  </span>
                  <div className={`p-2 rounded-xl ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900">
                    {stat.value}
                  </span>
                  <p className="text-[11px] text-teal-700 font-semibold mt-1">
                    {stat.change}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Table Container Card */}
        <Card className="p-6 border-slate-200 shadow-xs space-y-4">
          {/* Table Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search products by name..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:border-teal-500"
                title="Filter by availability">
                {AVAILABILITY_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DYNAMIC DATA TABLE BY SECTION */}
          <div className="overflow-x-auto">
            {/* 1. PRODUCTS TABLE */}
            {activeSection === "products" &&
              (filteredProducts.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800">
                    {allProducts.length === 0
                      ? "No products in catalog yet"
                      : "No products match your search"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {allProducts.length === 0
                      ? "Add your first product to populate the Pharmacy catalog."
                      : "Try a different name or availability filter."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-8">Stock</th>
                      <th className="py-3 px-10">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((row) => {
                      const inStock =
                        row.isActive !== false && Number(row.stock ?? 0) > 0;
                      return (
                        <tr
                          key={row._id}
                          className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {row.name}
                            {row.isActive === false && (
                              <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">{row.description}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            ₹{Number(row.price ?? 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-6">{row.stock} units</td>

                          <td className="py-3 px-4">
                            <Badge
                              variant={inStock ? "success" : "danger"}
                              size="sm"
                              dot>
                              {row.isActive === false
                                ? "INACTIVE"
                                : inStock
                                  ? "IN-STOCK"
                                  : "OUT-OF-STOCK"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                className="p-1 hover:bg-slate-100 rounded text-slate-600"
                                title="Edit"
                                onClick={() => {
                                  setEditingProduct(row);
                                  setIsAddProductOpen(true);
                                }}>
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1 hover:bg-rose-50 rounded text-rose-600"
                                title="Delete"
                                onClick={() => setDeletingProduct(row)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ))}
          </div>
        </Card>
      </main>

      {/* MODAL: ADD / EDIT PRODUCT */}
      <AddProductModal
        isOpen={isAddProductOpen}
        initialProduct={editingProduct}
        onClose={() => {
          setIsAddProductOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaved}
      />

      {/* MODAL: DELETE CONFIRMATION */}
      <Modal
        isOpen={!!deletingProduct}
        onClose={() => !isDeleting && setDeletingProduct(null)}
        title="Delete Product"
        subtitle="This action needs your confirmation"
        maxWidth="max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeletingProduct(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirmDelete}>
              {isDeleting ? "Deleting…" : "Delete Product"}
            </Button>
          </>
        }>
        <div className="space-y-2 text-xs text-slate-600">
          <p>
            Delete{" "}
            <strong className="text-slate-900">{deletingProduct?.name}</strong>{" "}
            from the catalog?
          </p>
          <p className="text-slate-500">
            Products referenced by existing orders are deactivated instead of
            deleted, so order history and records are always preserved.
          </p>
        </div>
      </Modal>

      {/* MODAL: DOCTOR / PATHOLOGIST VERIFICATION */}
      <VerificationModal
        isOpen={!!verificationTarget}
        onClose={() => setVerificationTarget(null)}
        item={verificationTarget}
        type={verificationTarget?.type}
        onApprove={() => setVerificationTarget(null)}
        onReject={() => setVerificationTarget(null)}
      />
    </div>
  );
}
