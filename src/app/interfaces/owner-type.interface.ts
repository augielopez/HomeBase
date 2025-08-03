export interface OwnerType {
    id: string;  // UUID
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}
