import xlsx from 'xlsx';
import path from 'path';
import puppeteer from 'puppeteer';
import Aggregate from '../models/Aggregate.js';
import Plant from '../models/Plant.js';
import { fetchElcenDailyAverages } from '../services/elcenScraper.js';

export const uploadReport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { manualPlantId, manualAggregateId, verificationType = 'excel' } = req.body;
        const filename = req.file.originalname;

        // For now we trust the frontend manual limits OR we send back the buffer processed
        // To make it fully backend-driven, the frontend should send the aggregateId
        if (!manualAggregateId) {
            return res.status(400).json({ message: 'Aggregate ID is required for limits context' });
        }

        // Fetch limits for this aggregate from DB
        const aggregate = await Aggregate.findByPk(manualAggregateId, {
            include: [{ model: Plant, as: 'plant' }]
        });
        if (!aggregate) {
            return res.status(404).json({ message: 'Aggregate not found in database' });
        }

        const limits = aggregate.limits;
        const plantName = aggregate.plant ? aggregate.plant.name : '';

        // Read the Excel buffer
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

        // Try to find a sheet name that matches the aggregate name
        let sheetName = null;
        const aggNameLower = aggregate.name.toLowerCase().replace(/\s+/g, '');

        for (const name of workbook.SheetNames) {
            const normalizedSheetName = name.toLowerCase().replace(/\s+/g, '');
            if (normalizedSheetName.includes(aggNameLower) || aggNameLower.includes(normalizedSheetName)) {
                sheetName = name;
                break;
            }
        }

        if (!sheetName) {
            return res.status(400).json({ message: `Nu s-a găsit niciun tab (sheet) cu date pentru agregatul "${aggregate.name}" în fișierul încărcat.` });
        }

        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON (array of arrays/objects)
        const json_data = xlsx.utils.sheet_to_json(worksheet, { defval: null });

        if (!json_data || json_data.length === 0) {
            return res.status(400).json({ message: 'Excel file is empty' });
        }

        // Basic column matching logic to simulate Pandas df.columns
        const exceedances = [];
        const discrepancies = []; // For daily average arithmetic checks

        const noxe = Object.keys(limits); // e.g ['SO2', 'Nox', 'Pulberi', ...]

        // Track hourly data to compute daily averages: { '2026-01-01': { 'SO2': { sum: 100, count: 24 }, ... } }
        const tracking = {};
        const dailyAveragesFromExcel = {}; // To store the parsed averages from Excel: { '2026-01-01': { 'SO2': 4.25, ... } }

        // Track valid records and missing/downtime hours
        let validHourlyRecords = 0;
        const missingRecordsList = [];

        json_data.forEach((row, index) => {
            // Stop evaluating if row is completely empty or just Totals/Medie
            const values = Object.values(row).filter(v => v !== null);
            if (values.length === 0) return;

            const excelRow = index + 2; // Offset for Excel 1-based index and Header row

            // Try to find Date/Hour columns
            let col_data = Object.keys(row).find(k => k && k.toLowerCase().includes('data')) || Object.keys(row)[0];
            let col_ora = Object.keys(row).find(k => k && k.toLowerCase().includes('ora')) || Object.keys(row)[1];

            let rowDate = 'N/A';
            if (row[col_data] != null) {
                rowDate = typeof row[col_data] === 'number'
                    ? xlsx.SSF.format("yyyy-MM-dd", row[col_data])
                    : String(row[col_data]).split(' ')[0];
            }

            let rowHour = 'N/A';
            if (row[col_ora] != null) {
                rowHour = typeof row[col_ora] === 'number'
                    ? xlsx.SSF.format("hh:mm", row[col_ora])
                    : String(row[col_ora]);
            }

            // Skip Totals/Averages
            if (rowDate.toLowerCase().includes('medie') || rowDate.toLowerCase().includes('total')) return;

            const isDailyAverage = rowHour === 'N/A' || rowHour.trim() === '';

            // Track if this specific hour has ANY valid noxa reading
            let hasValidNoxaData = false;

            // Check exceedances and build sums
            noxe.forEach(noxa => {
                // Find corresponding column in the row object keys using precise word boundary regex
                const colKey = Object.keys(row).find(k => k && new RegExp(`\\b${noxa}\\b`, 'i').test(k));

                if (colKey && row[colKey] !== null) {
                    const val = parseFloat(row[colKey]);
                    if (!isNaN(val)) {
                        const isDailyAverage = rowHour === 'N/A' || rowHour.trim() === '';

                        // Limit Exceedance Check
                        if (val > limits[noxa]) {
                            const messagePrefix = isDailyAverage
                                ? `[Rând Excel: **${excelRow}**] Medie Zilnică Excedată pe data de **${rowDate}**`
                                : `[Rând Excel: **${excelRow}**] Valoare Orară Excedată pe data **${rowDate}** la ora **${rowHour}**`;

                            exceedances.push(`${messagePrefix} ➡️ ${noxa}: **${val}** (limita admisă: **${limits[noxa]}**)`);
                        }

                        // Daily Average Arithmetic Check
                        if (!isDailyAverage) {
                            hasValidNoxaData = true;

                            // Accumulate hourly values for this day
                            if (!tracking[rowDate]) tracking[rowDate] = {};
                            if (!tracking[rowDate][noxa]) tracking[rowDate][noxa] = { sum: 0, count: 0 };

                            tracking[rowDate][noxa].sum += val;
                            tracking[rowDate][noxa].count += 1;
                        } else {
                            // This is a Daily Average row from the second table. Compare to our accumulated sum.
                            if (!dailyAveragesFromExcel[rowDate]) dailyAveragesFromExcel[rowDate] = {};
                            dailyAveragesFromExcel[rowDate][noxa] = val;

                            if (tracking[rowDate] && tracking[rowDate][noxa]) {
                                const stats = tracking[rowDate][noxa];
                                if (stats.count > 0) {
                                    const calculatedAverage = stats.sum / stats.count;
                                    // Check if the difference is more than a small float tolerance (e.g. 0.05)
                                    if (Math.abs(calculatedAverage - val) > 0.05) {
                                        discrepancies.push(`[Rând Excel: **${excelRow}**] Discrepanță Calcul Medie pe data de **${rowDate}** ➡️ ${noxa}: Raportat ca **${val}**, dar calculat din datele orare ca **${calculatedAverage.toFixed(2)}**`);
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // If it's an hourly row and NO noxa had data, we record it as downtime
            if (!isDailyAverage) {
                if (hasValidNoxaData) {
                    validHourlyRecords++;
                } else if (rowDate !== 'N/A' && rowHour !== 'N/A') {
                    missingRecordsList.push(`[Rând Excel: **${excelRow}**] lipsă date / oprit pe data de **${rowDate}** la ora **${rowHour}**`);
                }
            }
        });

        // Determine empty sheet
        const isEmptySheet = validHourlyRecords === 0;

        // SITE SCRAPING CROSS-VERIFICATION
        // Fetch public site data for the days we have daily averages for
        const siteMismatches = [];
        const daysToVerify = Object.keys(dailyAveragesFromExcel);

        if (verificationType === 'site' && daysToVerify.length > 0) {
            let browser = null;
            try {
                // Initialize a single shared browser context for all consecutive days
                browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                });

                // Process sequentially to not overload Elcen servers or memory (can take some time)
                for (const targetDate of daysToVerify) {
                    try {
                        // Ensure date is purely YYYY-MM-DD
                        const cleanDate = targetDate.substring(0, 10);
                        if (cleanDate.length === 10) {
                            const siteData = await fetchElcenDailyAverages(browser, cleanDate, plantName, aggregate.name);

                            if (siteData && siteData.mapped) {
                                const excelDataForDay = dailyAveragesFromExcel[targetDate];

                                // Compare each mapped noxa
                                for (const [noxa, siteValue] of Object.entries(siteData.mapped)) {
                                    // Only compare if we have it in our limits and excel
                                    if (excelDataForDay[noxa] !== undefined && !isNaN(siteValue)) {
                                        const excelValue = excelDataForDay[noxa];

                                        // User specifically noted 0.75 vs 0.74 (0.01 difference needs reporting)
                                        // So we tighten the tolerance to 0.009
                                        if (Math.abs(excelValue - siteValue) > 0.009) {
                                            siteMismatches.push(`Nepotrivire Date Publice ELCEN pe data de **${cleanDate}** ➡️ ${noxa}: În Excel este **${excelValue}**, iar publicat pe site este **${siteValue}**`);
                                        }
                                    }
                                }
                            } else {
                                siteMismatches.push(`AVERTISMENT: Nu am putut găsi/valida date publice pe site-ul ELCEN pentru centrala ${plantName} (Agregatul: **${aggregate.name}**) pe data de **${cleanDate}**.`);
                            }
                        }
                    } catch (scrapeErr) {
                        console.error(`Scrape error for ${targetDate}`, scrapeErr);
                    }
                }
            } catch (initErr) {
                console.error("Puppeteer Initialization Error:", initErr.message);
                siteMismatches.push(`AVERTISMENT: Verificarea automată a site-ului a eșuat la inițializare.`);
            } finally {
                if (browser) await browser.close();
            }
        }

        // If the user only asked for 'site' verification, we can filter out the excel results to avoid confusion
        res.json({
            message: 'File processed successfully',
            exceedances: verificationType === 'excel' ? exceedances : [],
            discrepancies: verificationType === 'excel' ? discrepancies : [],
            siteMismatches: siteMismatches,
            downtimeRecords: missingRecordsList,
            isEmptySheet: isEmptySheet,
            validHourlyRecords: validHourlyRecords,
            activeLimits: limits,
            evaluatedSheet: sheetName,
            verificationType: verificationType
        });

    } catch (error) {
        console.error('Error processing excel:', error);
        res.status(500).json({ message: 'Server error parsing report' });
    }
};
