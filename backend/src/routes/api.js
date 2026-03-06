import express from 'express';
import multer from 'multer';
import { login, verifyToken } from '../controllers/authController.js';
import {
    getPlantsAndAggregates,
    createPlant,
    createAggregate,
    updateAggregateLimits,
    deleteAggregate,
    deletePlant
} from '../controllers/limitsController.js';
import { uploadReport } from '../controllers/reportController.js';
import { saveReportToHistory, getHistoricalReports, deleteHistoricalReport } from '../controllers/historyController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Keep in RAM for validation

// Auth routes
router.post('/login', login);

// Requires Authentication for all below
router.use(verifyToken);

// Limits routes
router.get('/plants', getPlantsAndAggregates);
router.post('/plants', createPlant);
router.post('/plants/:plantId/aggregates', createAggregate);
router.put('/aggregates/:aggregateId/limits', updateAggregateLimits);
router.delete('/aggregates/:aggregateId', deleteAggregate);
router.delete('/plants/:plantId', deletePlant);

// Reports
router.post('/reports/verify', upload.single('excelFile'), uploadReport);

// History
router.post('/reports/history', saveReportToHistory);
router.get('/reports/history', getHistoricalReports);
router.delete('/reports/history/:id', deleteHistoricalReport);

export default router;
