export interface Store {
    id: string; // UUID
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    createdAt: Date;
}

