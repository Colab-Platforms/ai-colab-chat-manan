import api from "@/lib/api";

export const healthService = {
  get: () => api.get("/health"),
};

export const chatService = {
  create: (data: {
    title?: string;
    folderId?: number;
    assistantId?: number | null;
    modelIds?: number[];
    capability?: string;
  }) => api.post("/chats", data),
  list: (params?: Record<string, string>) => api.get("/chats", { params }),
  getById: (id: number) => api.get(`/chats/${id}`),
  archive: (id: number) => api.patch(`/chats/${id}/archive`),
  pin: (id: number) => api.patch(`/chats/${id}/pin`),
  share: (id: number) => api.patch(`/chats/${id}/share`),
  getShared: (shareId: string) => api.get(`/chats/shared/${shareId}`),
  delete: (id: number) => api.delete(`/chats/${id}`),
  update: (
    id: number,
    data: {
      title?: string;
      folderId?: number | null;
      assistantId?: number | null;
      modelIds?: number[];
      capability?: string;
    },
  ) => api.put(`/chats/${id}`, data),
  feedback: (chatId: number, responseId: number, isLiked: boolean | null) =>
    api.post(`/chats/${chatId}/responses/${responseId}/feedback`, { isLiked }),
  getContexts: (id: number) => api.get(`/chats/${id}/contexts`),
  replaceContexts: (id: number, contextIds: number[]) =>
    api.put(`/chats/${id}/contexts`, { contextIds }),
};

export const messageService = {
  create: (data: { chatId: number; content: string; editedFromId?: number }) =>
    api.post("/messages", data),
  enhancePrompt: (prompt: string) => api.post("/messages/enhance", { prompt }),
  listStarred: (params?: Record<string, string>) =>
    api.get("/messages/starred", { params }),
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
  getTransactions: (params?: Record<string, string>) => api.get("/wallet/transactions", { params }),
};

export const subscriptionService = {
  create: (data: { planId: number; billingCycle: string; forceRetry?: boolean }) =>
    api.post("/subscription/create", data),
  getCurrent: () => api.get("/subscription/current"),
  cancel: () => api.post("/subscription/cancel"),
  cancelPending: () => api.post("/subscription/cancel-pending"),
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
  dailyByModel: (params?: Record<string, string>) =>
    api.get("/usage-logs/daily-by-model", { params }),
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
  }) => api.put("/preferences", data),
};

export const assistantService = {
  list: (params?: Record<string, string>) => api.get("/assistants", { params }),
  getById: (id: number) => api.get(`/assistants/${id}`),
  create: (data: any) => api.post("/assistants", data),
  update: (id: number, data: any) => api.put(`/assistants/${id}`, data),
  toggle: (id: number) => api.patch(`/assistants/${id}/toggle`),
  delete: (id: number) => api.delete(`/assistants/${id}`),
};

export const dashboardService = {
  getSummary: () => api.get("/dashboard/summary"),
};

export const contextService = {
  list: (params?: Record<string, string>) => api.get("/contexts", { params }),
  getSidebar: (params?: Record<string, string>) => api.get("/contexts/sidebar", { params }),
  getById: (id: number) => api.get(`/contexts/${id}`),
  create: (data: any) => api.post("/contexts", data),
  update: (id: number, data: any) => api.put(`/contexts/${id}`, data),
  delete: (id: number) => api.delete(`/contexts/${id}`),
};
