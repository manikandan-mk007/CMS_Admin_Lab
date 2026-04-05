import API from "./axios";

export const loginApi = async (data) => {
  const response = await API.post("auth/login/", data);
  return response;
};