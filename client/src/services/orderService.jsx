import axios from "axios";

const getMyOrders = async (token) => {
  if (!token) {
    throw new Error("No auth token found. Please login again.");
  }

  const response = await axios.get("/api/order/my-orders", {
    headers: { authorization: `Bearer ${token}` },
  });

  return response.data ?? [];
};

const createOrder = async ({ token, productId }) => {
  if (!token) {
    throw new Error("No auth token found. Please login again.");
  }

  const response = await axios.post(`/api/order/${productId}`, null, {
    headers: { authorization: `Bearer ${token}` },
  });

  return response.data;
};

const orderService = { getMyOrders, createOrder };

export default orderService;
