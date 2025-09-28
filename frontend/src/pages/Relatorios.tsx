// frontend/src/pages/Relatorios.tsx

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import { generateReport } from "../services/api";
import { Loader2 } from "lucide-react";

export default function Relatorios() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            toast.warn("Por favor, selecione as datas de início e fim.");
            return;
        }
        setIsLoading(true);
        try {
            const pdfBlob = await generateReport({ startDate, endDate });
            
            // Cria um link temporário para fazer o download do arquivo
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_geral_${startDate}_a_${endDate}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("Relatório gerado com sucesso!");

        } catch (error: any) {
            toast.error(`Falha ao gerar relatório: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Módulo de Relatórios</h1>
                <p className="text-slate-500">Gere documentos oficiais a partir dos dados do sistema.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Relatório Geral de Atendimentos</CardTitle>
                    <CardDescription>Gera uma lista em PDF de todos os atendimentos realizados em um período específico.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="start-date">Data de Início</Label>
                            <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="end-date">Data de Fim</Label>
                            <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Button onClick={handleGenerateReport} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gerar Relatório em PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* No futuro, outros cards para outros tipos de relatório podem ser adicionados aqui */}
        </div>
    );
}