// frontend/src/pages/EmBreve.tsx
import React from 'react';
import { Settings } from 'lucide-react';

export default function EmBreve() {
    return (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-lg shadow-lg">
            <Settings className="h-16 w-16 text-gray-400 mb-4 animate-pulse" />
            <h1 className="text-2xl font-bold text-gray-700">Módulo em Desenvolvimento</h1>
            <p className="text-gray-500">Esta funcionalidade será implementada em breve. Agradecemos a compreensão.</p>
        </div>
    );
}