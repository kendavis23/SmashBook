import { useMutation } from "@tanstack/react-query";
import { requestExportEndpoint } from "@repo/api-client/modules/staff";
import type { ExportAccepted, ExportInput } from "../models";

export function useRequestExport() {
    return useMutation<ExportAccepted, Error, ExportInput>({
        mutationFn: (data: ExportInput) => requestExportEndpoint(data),
    });
}
