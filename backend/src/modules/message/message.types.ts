export interface CreateMessageBody {
    chatId: number;
    content: string;
    editedFromId?: number;
}
