// Domain models for the player profile context.

export interface UpdateProfileInput {
    full_name: string;
    phone: string;
    photo_url: string;
    preferred_notification_channel: string;
}
