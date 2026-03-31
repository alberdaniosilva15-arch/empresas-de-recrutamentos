import { auth } from "../firebase";

const getHeaders = async () => {
  const user = auth.currentUser;
  if (!user) return { "Content-Type": "application/json" };
  
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
};

export const api = {
  get: async (url: string) => {
    const headers = await getHeaders();
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API Request failed");
    }
    return response.json();
  },
  
  post: async (url: string, data: any) => {
    const headers = await getHeaders();
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API Request failed");
    }
    return response.json();
  },
  
  patch: async (url: string, data: any) => {
    const headers = await getHeaders();
    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API Request failed");
    }
    return response.json();
  },
  
  delete: async (url: string) => {
    const headers = await getHeaders();
    const response = await fetch(url, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API Request failed");
    }
    return response.json();
  }
};
