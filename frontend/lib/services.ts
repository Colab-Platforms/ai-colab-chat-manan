import api from "@/lib/api";

export const healthService = {
  get: () => api.get("/health"),
};

export const chatService = {
  create: (data: { title?: string; folderId?: number }) =>
    api.post("/chats", data),
  list: (params?: Record<string, string>) => api.get("/chats", { params }),
  getById: (id: number) => api.get(`/chats/${id}`),
  archive: (id: number) => api.patch(`/chats/${id}/archive`),
  pin: (id: number) => api.patch(`/chats/${id}/pin`),
  share: (id: number) => api.patch(`/chats/${id}/share`),
  getShared: (shareId: string) => api.get(`/chats/shared/${shareId}`),
  delete: (id: number) => api.delete(`/chats/${id}`),
  update: (id: number, data: { title?: string; folderId?: number | null }) =>
    api.put(`/chats/${id}`, data),
  feedback: (chatId: number, responseId: number, isLiked: boolean | null) =>
    api.post(`/chats/${chatId}/responses/${responseId}/feedback`, { isLiked }),
};

export const messageService = {
  create: (data: { chatId: number; content: string; editedFromId?: number }) =>
    api.post("/messages", data),
  listStarred: (params?: Record<string, string>) => api.get("/messages/starred", { params }),
  starResponse: (responseId: number, isStarred: boolean) =>
    api.patch(`/messages/responses/${responseId}/star`, { isStarred }),
};

export const modelService = {
  list: (params?: Record<string, string>) => api.get("/models", { params }),
  getById: (id: number) => api.get(`/models/${id}`),
  create: (data: any) => api.post("/models", data),
  update: (id: number, data: any) => api.put(`/models/${id}`, data),
  delete: (id: number) => api.delete(`/models/${id}`),
};

export const modelResponseService = {
  complete: (data: any) => api.post("/model-responses/complete", data),
};

export const folderService = {
  create: (data: { name: string }) => api.post("/folders", data),
  list: (params?: Record<string, string>) => api.get("/folders", { params }),
  update: (id: number, data: { name: string }) =>
    api.put(`/folders/${id}`, data),
  delete: (id: number, deleteChats: boolean) =>
    api.delete(`/folders/${id}`, {
      params: { deleteChats: deleteChats ? "true" : "false" },
    }),
};

export const userService = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: FormData) =>
    api.put("/users/profile", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  list: (params?: Record<string, string>) => api.get("/users", { params }),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  getUserUsage: (id: number, params?: Record<string, string>) =>
    api.get(`/users/${id}/usage`, { params }),
  getUserSubscription: (id: number) => api.get(`/users/${id}/subscription`),
};

export const walletService = {
  get: () => api.get("/wallet"),
};

export const subscriptionService = {
  create: (data: { planId: number; billingCycle: string }) =>
    api.post("/subscriptions", data),
  getCurrent: () => api.get("/subscriptions/current"),
  cancel: () => api.patch("/subscriptions/cancel"),
};

export const planService = {
  list: (params?: Record<string, string>) => api.get("/plans", { params }),
  getById: (id: number) => api.get(`/plans/${id}`),
  create: (data: any) => api.post("/plans", data),
  update: (id: number, data: any) => api.put(`/plans/${id}`, data),
  delete: (id: number) => api.delete(`/plans/${id}`),
};

export const usageLogService = {
  list: (params?: Record<string, string>) => api.get("/usage-logs", { params }),
};

export const modelProviderService = {
  list: (params?: Record<string, string>) =>
    api.get("/model-providers", { params }),
  getById: (id: number) => api.get(`/model-providers/${id}`),
  create: (data: any) => api.post("/model-providers", data),
  update: (id: number, data: any) => api.put(`/model-providers/${id}`, data),
  delete: (id: number) => api.delete(`/model-providers/${id}`),
};

export const attachmentService = {
  presend: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/attachments/presend", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  upload: (messageId: number, file: File) => {
    const formData = new FormData();
    formData.append("messageId", messageId.toString());
    formData.append("file", file);
    return api.post("/attachments", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  delete: (id: number) => api.delete(`/attachments/${id}`),
};

export const userPreferenceService = {
  getPreferences: () => api.get("/preferences"),
  updatePreferences: (data: {
    enableFollowUpQuestions?: boolean;
    contextMemory?: string[];
  }) => api.put("/preferences", data),
};
