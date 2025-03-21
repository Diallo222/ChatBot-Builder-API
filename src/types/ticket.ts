export type TicketStatus = "in_progress" | "resolved";

export interface Attachment {
  filename: string;
  url: string;
  size: number;
  type: string;
}

export interface Ticket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  attachments?: Attachment[];
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  supportResponse?: string;
}
