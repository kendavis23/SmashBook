export type TrainerOptionSource = {
    staff_profile_id?: string | null;
    id?: string | null;
    full_name: string;
};

export function getTrainerStaffProfileId(trainer: TrainerOptionSource): string {
    return trainer.staff_profile_id ?? trainer.id ?? "";
}

export function buildTrainerOptions(trainers: TrainerOptionSource[]) {
    return trainers
        .map((trainer) => ({
            value: getTrainerStaffProfileId(trainer),
            label: trainer.full_name,
        }))
        .filter((option) => option.value.length > 0);
}
