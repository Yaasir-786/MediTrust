import axios from "axios";

const requireToken = (token) => {
  if (!token) {
    throw new Error("No auth token found. Please login again.");
  }
};

const authHeaders = (token) => ({
  headers: { authorization: `Bearer ${token}` },
});

const bookTest = async ({ token, pathologistId, testId }) => {
  requireToken(token);

  const response = await axios.post(
    `/api/pathologist/${pathologistId}`,
    { pathologyTest: testId },
    authHeaders(token),
  );

  return response.data;
};

const applyAsPathologist = async ({ token, payload }) => {
  requireToken(token);

  const response = await axios.post(
    "/api/pathologist/request",
    payload,
    authHeaders(token),
  );

  return response.data;
};

const getMyAppointments = async (token) => {
  requireToken(token);

  const response = await axios.get(
    "/api/pathologist/my-appointments",
    authHeaders(token),
  );

  return response.data ?? [];
};

const getLabAppointments = async (token) => {
  requireToken(token);

  const response = await axios.get(
    "/api/pathologist/appointments",
    authHeaders(token),
  );

  return response.data ?? [];
};

const addTest = async ({ token, payload }) => {
  requireToken(token);

  const response = await axios.post(
    "/api/pathologist/add",
    payload,
    authHeaders(token),
  );

  return response.data;
};

const updateAppointment = async ({ token, appointmentId, status }) => {
  requireToken(token);

  const response = await axios.put(
    `/api/pathologist/appointments/${appointmentId}`,
    { status },
    authHeaders(token),
  );

  return response.data;
};

const pathologistService = {
  bookTest,
  applyAsPathologist,
  getMyAppointments,
  getLabAppointments,
  addTest,
  updateAppointment,
};

export default pathologistService;
