import ExcelJS from 'exceljs';

export const exportToXlsx = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Niciun fișier valid nu a fost încărcat.' });
        }

        // Încărcăm fișierul XLSM (macros / butoane)
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);

        // Scriem înapoi workbook-ul cu suport de XLSX simplu.
        // ExcelJS din oficiu șterge vbaProject.bin (macro-uri) atunci când scrii un Buffer nou de tip xlsx pur
        // Și deseori curăță automat layerele de input/controls din desene
        const outputBuffer = await workbook.xlsx.writeBuffer();

        // Înlocuim extensia XLSM cu XLSX din formatul original
        let exportName = req.file.originalname;
        if (exportName.toLowerCase().endsWith('.xlsm')) {
            exportName = exportName.substring(0, exportName.length - 5) + '.xlsx';
        } else if (!exportName.toLowerCase().endsWith('.xlsx')) {
            exportName += '.xlsx';
        }

        // Setăm headerele ca browserul să declașenze descărcarea
        res.setHeader('Content-Disposition', `attachment; filename="${exportName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(outputBuffer);

    } catch (error) {
        console.error('Error extracting pure xlsx file:', error);
        res.status(500).json({ message: 'Eroare la spălarea și procesarea fișierului spre .xlsx' });
    }
};
