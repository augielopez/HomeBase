export interface Account {
    id: string;  // UUID
    name: string;
    url: string | null;
    loginId: string | null;  // UUID
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
    notes: string;
}
