// Domain models for the staff profile context.

export interface UpdateProfileInput {
    full_name: string;
    phone: string;
    photo_url: string;
    preferred_notification_channel: string;
}
