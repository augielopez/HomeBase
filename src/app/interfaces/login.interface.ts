export interface Login {
    id: string;  // UUID
    username: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}
