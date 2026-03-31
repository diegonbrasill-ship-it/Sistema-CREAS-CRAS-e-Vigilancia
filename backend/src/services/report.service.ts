// backend/src/services/report.service.ts
import PDFDocument from 'pdfkit';
import { Buffer } from 'node:buffer';
import type { DashboardFilters, DashboardResponsePayload } from './dashboard.service';

// Definimos o tipo de dado que nosso relatório espera
export type CasoParaRelatorio = {
    id: number;
    data_cad: string;
    tec_ref: string | null;
    nome: string | null;
    bairro: string | null;
    tipoViolencia: string | null;
};

export async function renderGeneralReportPdf(casos: CasoParaRelatorio[]): Promise<Buffer> {
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
            doc.text(new Date(caso.data_cad).toLocaleDateString('pt-BR'), itemX, rowY, { width: 90 });
            doc.text(caso.tec_ref ?? '', tecRefX, rowY, { width: 90 });
            doc.text(caso.nome ?? '', nomeX, rowY, { width: 140 });
            doc.text(caso.bairro ?? '', bairroX, rowY, { width: 150 });
            doc.moveDown();
        });

        doc.end();
    });
}

export const generateGeneralReportPDF = renderGeneralReportPdf;

type DashboardReportContext = {
    filters: DashboardFilters;
    generatedBy?: string;
};

function ensurePageSpace(doc: PDFKit.PDFDocument, minSpace = 80) {
    if (doc.y > doc.page.height - minSpace) {
        doc.addPage();
    }
}

function writeDashboardSectionTitle(doc: PDFKit.PDFDocument, title: string) {
    ensurePageSpace(doc, 100);
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(14).text(title);
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
}

function writeDashboardItemList(doc: PDFKit.PDFDocument, items: Array<{ label: string; value: string | number }>) {
    items.forEach((item) => {
        ensurePageSpace(doc, 40);
        doc.text(`${item.label}: ${item.value}`);
    });
}

function writeDashboardChart(doc: PDFKit.PDFDocument, title: string, items: Array<{ name: string; value: number }>) {
    writeDashboardSectionTitle(doc, title);

    if (items.length === 0) {
        doc.text('Sem dados para exibir.');
        return;
    }

    items.forEach((item) => {
        ensurePageSpace(doc, 35);
        doc.text(`${item.name}: ${item.value}`);
    });
}

export async function renderDashboardReportPdf(
    payload: DashboardResponsePayload,
    context: DashboardReportContext
): Promise<Buffer> {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        doc.fontSize(18).font('Helvetica-Bold').text('Relatório do Dashboard', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(
            `Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
            { align: 'center' }
        );
        if (context.generatedBy) {
            doc.text(`Gerado por: ${context.generatedBy}`, { align: 'center' });
        }

        writeDashboardSectionTitle(doc, 'Filtros Aplicados');
        writeDashboardItemList(doc, [
            { label: 'Mês', value: context.filters.mes ?? 'Todos' },
            { label: 'Técnico', value: context.filters.tec_ref ?? 'Todos' },
            { label: 'Bairro', value: context.filters.bairro ?? 'Todos' },
        ]);

        writeDashboardSectionTitle(doc, 'Indicadores');
        writeDashboardItemList(doc, [
            { label: 'Total de Atendimentos', value: payload.dados.indicadores.totalAtendimentos },
            { label: 'Novos no Mês', value: payload.dados.indicadores.novosNoMes },
            { label: 'Inseridos PAEFI', value: payload.dados.indicadores.inseridosPAEFI },
            { label: 'Reincidentes', value: payload.dados.indicadores.reincidentes },
            { label: 'Recebem Bolsa Família', value: payload.dados.indicadores.recebemBolsaFamilia },
            { label: 'Recebem BPC', value: payload.dados.indicadores.recebemBPC },
            { label: 'Violência Confirmada', value: payload.dados.indicadores.violenciaConfirmada },
            { label: 'Notificados SINAN', value: payload.dados.indicadores.notificadosSINAN },
        ]);

        writeDashboardSectionTitle(doc, 'Contexto Familiar');
        writeDashboardItemList(doc, [
            { label: 'Dependência Financeira', value: payload.dados.indicadores.contextoFamiliar.dependenciaFinanceira ?? '0' },
            { label: 'Vítima PCD', value: payload.dados.indicadores.contextoFamiliar.vitimaPCD ?? '0' },
            { label: 'Membro Carcerário', value: payload.dados.indicadores.contextoFamiliar.membroCarcerario ?? '0' },
            { label: 'Membro Socioeducação', value: payload.dados.indicadores.contextoFamiliar.membroSocioeducacao ?? '0' },
        ]);

        writeDashboardSectionTitle(doc, 'Principais');
        writeDashboardItemList(doc, [
            { label: 'Moradia Principal', value: payload.dados.principais.moradiaPrincipal },
            { label: 'Escolaridade Principal', value: payload.dados.principais.escolaridadePrincipal },
            { label: 'Violência Principal', value: payload.dados.principais.violenciaPrincipal },
            { label: 'Local Principal', value: payload.dados.principais.localPrincipal },
        ]);

        writeDashboardChart(doc, 'Casos por Bairro', payload.dados.graficos.casosPorBairro);
        writeDashboardChart(doc, 'Tipos de Violação', payload.dados.graficos.tiposViolacao);
        writeDashboardChart(doc, 'Encaminhamentos Top 5', payload.dados.graficos.encaminhamentosTop5);
        writeDashboardChart(doc, 'Casos por Sexo', payload.dados.graficos.casosPorSexo);
        writeDashboardChart(doc, 'Canal de Denúncia', payload.dados.graficos.canalDenuncia);
        writeDashboardChart(doc, 'Casos por Cor', payload.dados.graficos.casosPorCor);
        writeDashboardChart(doc, 'Casos por Faixa Etária', payload.dados.graficos.casosPorFaixaEtaria);

        writeDashboardSectionTitle(doc, 'Opções de Filtro Disponíveis');
        writeDashboardItemList(doc, [
            { label: 'Meses', value: payload.opcoesFiltro.meses.join(', ') || 'Nenhum' },
            { label: 'Técnicos', value: payload.opcoesFiltro.tecnicos.join(', ') || 'Nenhum' },
            { label: 'Bairros', value: payload.opcoesFiltro.bairros.join(', ') || 'Nenhum' },
        ]);

        doc.end();
    });
}
