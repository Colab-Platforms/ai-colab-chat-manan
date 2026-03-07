export interface CreateMessageBody {
    chatId: number;
    content: string;
    editedFromId?: number;
}

export interface StarResponseBody {
    isStarred: boolean;
}

export interface ListStarredQuery {
    page?: string;
    pageSize?: string;
}
