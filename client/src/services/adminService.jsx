import axios from "axios";

const fetchAdminData = async (payload) => {
  if (!payload) {
    throw new Error("No auth token found. Please login as Admin.");
  }

  const options = {
    headers: {
      authorization: `Bearer ${payload}`,
    },
  };

  const [
    responseForUsers,
    responseForProducts,
    responseForOrders,
    responseForDoctors,
    responseForPathologists,
  ] = await Promise.all([
    axios.get("/api/admin/users", options),
    axios.get("/api/admin/products", options),
    axios.get("/api/admin/orders", options),
    axios.get("/api/admin/doctors", options),
    axios.get("/api/admin/pathologists", options),
  ]);

  const data = {
    users: responseForUsers.data ?? [],
    products: responseForProducts.data ?? [],
    orders: responseForOrders.data ?? [],
    doctors: responseForDoctors.data ?? [],
    pathologists: responseForPathologists.data ?? [],
  };

  return data;
};

const adminService = { fetchAdminData };

export default adminService;
