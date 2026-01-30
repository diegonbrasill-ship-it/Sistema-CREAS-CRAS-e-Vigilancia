// src/utils/apiNormalizer.ts
export function normalizeListResponse<T>(response: any): T[] {
    if (Array.isArray(response)) return response;

    return (
        response?.rows ??
        response?.data ??
        response?.results ??
        []
    );
}
