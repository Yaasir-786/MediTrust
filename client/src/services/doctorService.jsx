import axios from "axios";

const requireToken = (token) => {
  if (!token) {
    throw new Error("No auth token found. Please login again.");
  }
};

const authHeaders = (token) => ({
  headers: { authorization: `Bearer ${token}` },
});

const bookAppointment = async ({ token, doctorId }) => {
  requireToken(token);

  const response = await axios.post(
    `/api/doctor/${doctorId}`,
    null,
    authHeaders(token),
  );

  return response.data;
};

const applyAsDoctor = async ({ token, payload }) => {
  requireToken(token);

  const response = await axios.post(
    "/api/doctor/request",
    payload,
    authHeaders(token),
  );

  return response.data;
};

const getMyAppointments = async (token) => {
  requireToken(token);

  const response = await axios.get(
    "/api/doctor/my-appointments",
    authHeaders(token),
  );

  return response.data ?? [];
};

const getDoctorAppointments = async (token) => {
  requireToken(token);

  const response = await axios.get(
    "/api/doctor/appointments",
    authHeaders(token),
  );

  return response.data ?? [];
};

const updateAppointment = async ({ token, appointmentId, status }) => {
  requireToken(token);

  const response = await axios.put(
    `/api/doctor/appointments/${appointmentId}`,
    { status },
    authHeaders(token),
  );

  return response.data;
};

const doctorService = {
  bookAppointment,
  applyAsDoctor,
  getMyAppointments,
  getDoctorAppointments,
  updateAppointment,
};

export default doctorService;
