export interface Item {
    id: string; // UUID
    name: string;
    category: string | null;
    description: string | null;
    createdAt: Date;
}

