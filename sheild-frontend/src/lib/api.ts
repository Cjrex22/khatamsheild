import { getAuth } from "firebase/auth";
import toast from 'react-hot-toast';

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

async function authFetch(path: string, opts: RequestInit = {}) {
    const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout for Render cold starts

  try {
    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401) {
          toast.error("Session expired. Please sign in again.");
          getAuth().signOut();
          window.location.href = '/auth/signin';
          throw new Error("Session expired. Please sign in again.");
      }
      if (res.status === 403) {
          toast.error("You do not have permission to do that.");
          throw new Error("You do not have permission to do that.");
      }
      if (res.status === 503) {
          toast.error("Database temporarily unavailable. Please try again.");
          throw new Error("Database temporarily unavailable. Please try again.");
      }
      if (res.status === 500) {
          toast.error("Server error. Please try again in a moment.");
          throw new Error("Server error. Please try again in a moment.");
      }
      const err = await res.json().catch(() => ({ message: "Request failed" }));
      throw new Error(err.message || "Request failed");
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
       toast.error("Request timed out. Please try again.");
       throw new Error("Request timed out. Please try again.");
    }
    if (error.name === 'TypeError') {
       toast.error("Network error. Please check your internet connection.");
       throw new Error("No internet connection. Please check your network.");
    }
    throw error;
  }
}

export const api = {
  get: (path: string) => authFetch(path),
  post: (path: string, body?: unknown) =>
    authFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body?: unknown) =>
    authFetch(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path: string) => authFetch(path, { method: "DELETE" }),
  postFormData: async (path: string, fd: FormData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for file upload
    try {
        const token = await getAuth().currentUser?.getIdToken();
        const res = await fetch(`${BASE}${path}`, { 
            method: "POST", 
            body: fd, 
            signal: controller.signal,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            } 
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
            if (res.status === 503) throw new Error("Database temporarily unavailable.");
            throw new Error("Upload failed");
        }
        return await res.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            toast.error("Upload timed out. Please try again.");
            throw new Error("Request timed out. Please try again.");
        }
        if (error.name === 'TypeError') {
            toast.error("Network error. Please check your internet connection.");
            throw new Error("No internet connection. Please check your network.");
        }
        throw error;
    }
  }
};
