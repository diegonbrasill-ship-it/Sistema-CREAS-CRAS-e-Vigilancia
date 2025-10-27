// backend/src/services/report.service.ts
import PDFDocument from 'pdfkit';
import { Buffer } from 'node:buffer';

// ⭐️ TIPAGEM CORRIGIDA: Garante que os campos JSONB sejam tratados como string | null ⭐️
type CasoParaRelatorio = {
    id: number;
    dataCad: string; // Vem como string de data do DB
    tecRef: string | null;
    nome: string | null;
    bairro: string | null;
    tipoViolencia: string | null; // Tipagem corrigida para incluir null
};

export async function generateGeneralReportPDF(casos: CasoParaRelatorio[]): Promise<Buffer> {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        // Cabeçalho do Documento
        doc.fontSize(18).text('Relatório Geral de Atendimentos', { align: 'center' });
        doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, { align: 'center' });
        doc.moveDown(2);

        // Cabeçalho da Tabela
        const tableTop = doc.y;
        const itemX = 50;
        const tecRefX = 150;
        const nomeX = 250;
        const bairroX = 400;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Data Cad.', itemX, tableTop);
        doc.text('Téc. Ref.', tecRefX, tableTop);
        doc.text('Nome da Vítima', nomeX, tableTop);
        doc.text('Bairro', bairroX, tableTop);
        doc.font('Helvetica').moveDown();
        
        // Linha abaixo do cabeçalho
        const lineY = doc.y;
        doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(itemX, lineY).lineTo(550, lineY).stroke();

        // Conteúdo da Tabela
        casos.forEach(caso => {
            doc.moveDown(0.5);
            const rowY = doc.y;
            
            // ⭐️ TRATAMENTO DE NULOS NA RENDERIZAÇÃO ⭐️
            const nomeDisplay = caso.nome || 'N/A';
            const tecRefDisplay = caso.tecRef || 'N/A';
            const bairroDisplay = caso.bairro || 'N/A';

            doc.text(new Date(caso.dataCad).toLocaleDateString('pt-BR'), itemX, rowY, { width: 90 });
            doc.text(tecRefDisplay, tecRefX, rowY, { width: 90 });
            doc.text(nomeDisplay, nomeX, rowY, { width: 140 });
            doc.text(bairroDisplay, bairroX, rowY, { width: 150 });
            doc.moveDown();
        });

        doc.end();
    });
}