import Report from '../models/Report.js';
import Plant from '../models/Plant.js';
import Aggregate from '../models/Aggregate.js';

export const saveReportToHistory = async (req, res) => {
    try {
        const {
            plantId,
            aggregateId,
            reportMonth,
            fileName,
            exceedances,
            discrepancies,
            siteMismatches,
            downtimeRecords,
            activeLimits
        } = req.body;

        if (!plantId || !aggregateId || !reportMonth || !fileName) {
            return res.status(400).json({ message: 'Lipsește luna, fisierul, centrala sau agregatul pentru a salva raportul.' });
        }

        const report = await Report.create({
            plantId,
            aggregateId,
            reportMonth,
            fileName,
            exceedances: exceedances || [],
            discrepancies: discrepancies || [],
            siteMismatches: siteMismatches || [],
            downtimeRecords: downtimeRecords || [],
            activeLimits: activeLimits || {}
        });

        res.status(201).json({ message: 'Raportul validat a fost salvat cu succes în baza de date!', report });
    } catch (error) {
        console.error('Error saving report to history:', error);
        res.status(500).json({ message: 'Eroare la salvarea în istoricul bazei de date.' });
    }
};

export const getHistoricalReports = async (req, res) => {
    try {
        const reports = await Report.findAll({
            include: [
                { model: Plant, as: 'plant', attributes: ['name'] },
                { model: Aggregate, as: 'aggregate', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(reports);
    } catch (error) {
        console.error('Error fetching historical reports:', error);
        res.status(500).json({ message: 'Eroare la preluarea istoricului de rapoarte din baza de date.' });
    }
};

export const deleteHistoricalReport = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await Report.findByPk(id);
        if (!report) {
            return res.status(404).json({ message: 'Raportul nu a fost găsit în istoric.' });
        }

        await report.destroy();
        res.json({ message: 'Raport șters cu succes din istoric.' });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ message: 'Eroare la ștergerea raportului.' });
    }
};
