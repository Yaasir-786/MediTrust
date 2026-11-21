import React, { useEffect } from "react";
import {
  ShieldCheck,
  Truck,
  AlertCircle,
  FileText,
  Sparkles,
  Pill,
  Clock,
  ArrowRight,
  RotateCw,
  Package,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import LoaderScreen from "../../components/common/Loader";
import medicalService from "../../services/medicalService";
import orderService from "../../services/orderService";
import { logoutUser } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

const formatMoney = (value) => {
  const n = Number(value ?? 0);
  return `₹${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
};

export default function ProductDetailPage() {
  const { pid } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);

  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["product", pid],
    queryFn: () => medicalService.fetchProduct(pid),
    enabled: !!pid,
    retry: false,
  });

  // Other active products for the related section.
  const { data: catalog } = useQuery({
    queryKey: ["items"],
    queryFn: medicalService.fetchData,
  });

  const isSessionExpired = error?.response?.status === 401;

  useEffect(() => {
    if (isSessionExpired) {
      localStorage.removeItem("user");
      dispatch(logoutUser());
      navigate("/login");
    }
  }, [isSessionExpired, dispatch, navigate]);

  const orderMutation = useMutation({
    mutationFn: () =>
      orderService.createOrder({ token: user?.token, productId: pid }),
    onSuccess: () => {
      toast.success("Order placed successfully.");
      queryClient.invalidateQueries({ queryKey: ["my-orders", user?.token] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      navigate("/auth/orders");
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
          "Could not place the order.",
      );
    },
  });

  const handleOrder = () => {
    if (!user?.token) {
      navigate("/login");
      return;
    }
    orderMutation.mutate();
  };

  if (isLoading) {
    return <LoaderScreen />;
  }

  if (isSessionExpired) {
    return null;
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Package className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Could not load this product
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {error?.response?.data?.message ||
                error?.message ||
                "Something went wrong while fetching the product."}
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

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
            <Pill className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              Product not found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              This medicine is no longer available in the catalog.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate("/pharmacy")}
              icon={ArrowRight}
              iconPosition="right">
              Browse Pharmacy
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const stock = Number(product.stock ?? 0);
  const inStock = stock > 0;
  const related = (catalog?.medicines ?? [])
    .filter((med) => med._id !== product._id)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumb Bar */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button onClick={() => navigate("/")} className="hover:text-teal-600">
          Home
        </button>
        <span>/</span>
        <button
          onClick={() => navigate("/pharmacy")}
          className="hover:text-teal-600">
          Pharmacy
        </button>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate">
          {product.name}
        </span>
      </div>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Product Image (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-center aspect-square overflow-hidden relative">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <Package className="w-20 h-20 text-slate-200" />
            )}
            {!inStock && (
              <div className="absolute top-4 left-4">
                <Badge variant="danger" size="md">
                  Out of Stock
                </Badge>
              </div>
            )}
          </div>

          {/* AI Clinical Explainer Promo Card */}
          <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200/80 p-4 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-950">
                MediTrust AI Prescription Check
              </h4>
              <p className="text-xs text-indigo-800/80 mt-0.5">
                Have an active doctor's prescription slip? Upload it to
                auto-verify dosage instructions.
              </p>
              <button
                type="button"
                onClick={() => navigate("/auth/ai-hub/prescription")}
                className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1">
                Upload & Verify Rx Now <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Info & Direct Purchase Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="info" size="sm">
                Medicine
              </Badge>
              <Badge
                variant={inStock ? "success" : "danger"}
                size="sm"
                dot>
                {inStock ? "In Stock" : "Out of Stock"}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900">
                {formatMoney(product.price)}
              </span>
              <span className="text-xs text-slate-500">per unit</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>
                Available stock:{" "}
                <strong className="text-slate-800">{stock}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Expires on:{" "}
                <strong className="text-slate-800">{product.expiresOn}</strong>
              </span>
            </div>
          </div>

          {/* Direct Buy Section */}
          <div className="bg-white rounded-2xl p-5 border border-teal-200/80 shadow-md space-y-4">
            {!inStock && (
              <div className="flex items-center gap-2 text-xs text-rose-600 font-semibold">
                <AlertCircle className="w-4 h-4" />
                This medicine is currently out of stock.
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md shadow-teal-600/25"
              onClick={handleOrder}
              disabled={!inStock || orderMutation.isPending}>
              {orderMutation.isPending
                ? "Placing Order…"
                : inStock
                  ? `Order Now (${formatMoney(product.price)})`
                  : "Out of Stock"}
            </Button>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Fast doorstep dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>100% Genuine Pharmacy Guarantee</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              Medicine Description
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {/* Related Products Row */}
      {related.length > 0 && (
        <div className="pt-8 border-t border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Frequently Purchased Together
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complementary supplements and care essentials
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/pharmacy")}>
              Browse More
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((prod) => (
              <Card
                key={prod._id}
                hoverEffect
                className="p-4 flex flex-col justify-between">
                <div>
                  <div className="aspect-square bg-slate-50 rounded-xl p-4 mb-3 flex items-center justify-center">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-slate-200" />
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {prod.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {prod.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">
                    {formatMoney(prod.price)}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/pharmacy/${prod._id}`)}>
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
