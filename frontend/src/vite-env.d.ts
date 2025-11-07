/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    // adicione outras variáveis de ambiente aqui se precisar
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}