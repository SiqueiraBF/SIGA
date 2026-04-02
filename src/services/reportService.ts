
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { nuntecService } from './nuntecService';
import type { Posto, NuntecConsumption, NuntecMeasurement, NuntecReservoir } from '../types';

export interface ReportData {
    date: Date;
    initialStock: number;
    entries: number;
    consumption: number;
    finalTheoretical: number;
    finalPhysical: number;
    difference: number;
    diffPercentage: number;
}

export const reportService = {
    async generateStationReport(
        posto: Posto & { fazenda: { nome: string } },
        startDate: string,
        endDate: string,
        reservoirData?: NuntecReservoir
    ) {
        // 1. Prepare IDs for matching
        const allMatchingIds = new Set<string>();
        if (posto.nuntec_reservoir_id) allMatchingIds.add(String(posto.nuntec_reservoir_id));
        if (reservoirData) {
            allMatchingIds.add(String(reservoirData.id));
            reservoirData.nozzleIds?.forEach(id => allMatchingIds.add(String(id)));
        }

        const allowedIds = Array.from(allMatchingIds);

        // 2. Fetch Data
        const [consumptions, measurements, supplies] = await Promise.all([
            nuntecService.getConsumptions(startDate, endDate, allowedIds),
            nuntecService.getStockMeasurements(allowedIds, startDate),
            nuntecService.getSupplies(startDate, endDate, allowedIds)
        ]);

        // 3. Aggregate Data by Day
        const days = eachDayOfInterval({
            start: parseISO(startDate),
            end: parseISO(endDate)
        });

        const reportRows: ReportData[] = [];
        const sortedMeasurements = [...measurements].sort((a, b) => 
            new Date(a['measured-at']).getTime() - new Date(b['measured-at']).getTime()
        );

        days.forEach((day, index) => {
            const dayConsumptions = consumptions.filter(c => isSameDay(parseISO(c['end-date']), day));
            const daySupplies = supplies.filter(s => isSameDay(parseISO(s.date), day));
            const dayMeasurements = measurements.filter(m => isSameDay(parseISO(m['measured-at']), day));

            const totalConsumption = dayConsumptions.reduce((sum, c) => sum + c.amount, 0);
            const totalEntries = daySupplies.reduce((sum, s) => sum + s.amount, 0);

            let initialStock = 0;
            if (index === 0) {
                const beforeMeasure = [...sortedMeasurements].reverse().find(m => parseISO(m['measured-at']) <= day);
                initialStock = beforeMeasure ? beforeMeasure.amount : (dayMeasurements.length > 0 ? dayMeasurements[0].amount : 0);
            } else {
                initialStock = reportRows[index - 1].finalPhysical;
            }

            const lastMeasurement = dayMeasurements.length > 0 
                ? dayMeasurements.sort((a, b) => new Date(b['measured-at']).getTime() - new Date(a['measured-at']).getTime())[0].amount
                : initialStock + totalEntries - totalConsumption;

            const finalTheoretical = initialStock + totalEntries - totalConsumption;
            const finalPhysical = lastMeasurement;
            const difference = finalPhysical - finalTheoretical;
            const diffPercentage = Math.abs(finalTheoretical) > 0 ? (difference / finalTheoretical) * 100 : 0;

            reportRows.push({
                date: day,
                initialStock,
                entries: totalEntries,
                consumption: totalConsumption,
                finalTheoretical,
                finalPhysical,
                difference,
                diffPercentage
            });
        });

        // 4. PDF Generation
        const doc = new jsPDF();
        
        // Header Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const title = `Consumo ${posto.nome} ${format(parseISO(startDate), 'dd/MM')} a ${format(parseISO(endDate), 'dd/MM')} - ${reportRows.length} Dias`;
        const titleWidth = doc.getTextWidth(title);
        doc.setFillColor(0, 0, 0);
        doc.rect(14, 15, 182, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(title, 14 + (182 - titleWidth) / 2, 22);

        // Calculate Summary Stats
        const totalOut = reportRows.reduce((sum, r) => sum + r.consumption, 0);
        const avgOut = totalOut / reportRows.length;
        const mainCapacity = reservoirData?.capacity || 0;
        const currentStock = reservoirData && reservoirData.stock !== undefined ? reservoirData.stock : reportRows[reportRows.length - 1].finalPhysical;
        
        // Render Main Table
        autoTable(doc, {
            startY: 32,
            head: [['Rótulos de Linha', 'Soma de Quantidade CONSUMIDA DIARIA', 'Média Dia', 'Saldo Estoque', 'Dias Cobert.']],
            body: reportRows.map((r, i) => [
                format(r.date, 'dd/MM/yyyy'),
                r.consumption.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                i === 0 ? avgOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                i === 0 ? currentStock.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
                i === 0 ? (avgOut > 0 ? (currentStock / avgOut).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00') : ''
            ]),
            headStyles: {
                fillColor: [30, 41, 59], // Darker slate for premium look
                textColor: [255, 255, 255],
                fontSize: 8.5,
                halign: 'center',
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 35 },
                1: { halign: 'right', cellWidth: 70 },
                2: { halign: 'right', cellWidth: 25 },
                3: { halign: 'right', cellWidth: 30 },
                4: { halign: 'right', cellWidth: 22 }
            },
            styles: { 
                fontSize: 8, 
                lineColor: [226, 232, 240],
                lineWidth: 0.1,
                textColor: [51, 65, 85]
            },
            theme: 'grid'
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        // Footer Total Geral
        doc.setFillColor(248, 250, 252); // Lighter background
        doc.rect(14, finalY, 105, 8, 'F');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Geral', 18, finalY + 5.5);
        doc.text(totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 119, finalY + 5.5, { align: 'right' });
        doc.setDrawColor(203, 213, 225);
        doc.line(14, finalY + 8, 196, finalY + 8);

        // Capacity Summary Block
        const summaryWidth = 77;
        const summaryX = 196 - summaryWidth; 
        const summaryYStart = finalY + 15;
        
        const summaryData = [
            ['TANQUE POSTO', mainCapacity],
            ['TOTAL', mainCapacity],
            ['ESPAÇO LIVRE', mainCapacity - currentStock]
        ];

        doc.setFontSize(8.5);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        
        doc.rect(summaryX, summaryYStart, summaryWidth, 8, 'FD'); 
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('CAPACIDADE TANCAGEM', summaryX + summaryWidth/2, summaryYStart + 5.5, { align: 'center' });

        let currentSumY = summaryYStart + 8;
        summaryData.forEach((row, idx) => {
            const isTotal = row[0] === 'TOTAL';
            const isFree = row[0] === 'ESPAÇO LIVRE';
            
            if (isFree) {
                doc.setFillColor(254, 240, 138); // Soft Yellow
                doc.setFont('helvetica', 'bold');
            } else {
                doc.setFillColor(255, 255, 255);
                doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
            }
            
            doc.rect(summaryX, currentSumY, 45, 8, isFree ? 'FD' : 'D');
            doc.rect(summaryX + 45, currentSumY, summaryWidth - 45, 8, isFree ? 'FD' : 'D');
            
            doc.setTextColor(30, 41, 59);
            doc.text(String(row[0]), summaryX + 3, currentSumY + 5.5);
            doc.text(Number(row[1]).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), summaryX + summaryWidth - 3, currentSumY + 5.5, { align: 'right' });
            
            currentSumY += 8;
        });

        // Yellow footer banner
        const footerY = Math.max(finalY + 30, currentSumY + 12);
        const freeSpaceValue = mainCapacity - currentStock;
        doc.setFillColor(254, 240, 138);
        doc.rect(14, footerY, 182, 10, 'F');
        doc.setTextColor(133, 77, 14); // Darker yellow/brown text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const footerText = `ESPAÇO LIVRE HOJE CAPACIDADE PARA ${freeSpaceValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`;
        const footerTextWidth = doc.getTextWidth(footerText);
        doc.text(footerText, 14 + (182 - footerTextWidth) / 2, footerY + 6.5);

        // Metadata
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, footerY + 16);

        const filename = `Relatorio_${posto.nome.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
        doc.save(filename);
    }
};
