export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}