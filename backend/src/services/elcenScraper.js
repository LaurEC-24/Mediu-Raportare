import puppeteer from 'puppeteer';

export const fetchElcenDailyAverages = async (browser, dateStr, centralaSearch, instalatieSearch = null) => {
    // Expected dateStr Format: YYYY-MM-DD
    let page = null;
    try {
        page = await browser.newPage();

        // Elcen format requires YYYY-MM-DD
        const url = `https://www.elcen.ro/emisii/?date=${dateStr}`;
        console.log(`[Scraper] Navighez către site-ul ELCEN: ${url} ...`);
        
        // Timeout redus de la 30s la 15s. Util in retele Enterprise care blocheaza internetul prin Firewall (Portainer)
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // CRITICAL FIX: The table HTML is present instantly, but the data is fetched via AJAX.
        // We must wait for at least one table cell (td) to be injected into the DOM.
        // If it throws a timeout, it means either the site is down or there genuinely is no data for that day.
        try {
            await page.waitForSelector('#table tr td', { timeout: 10000 });
        } catch (timeoutErr) {
            // No data loaded for this date within 10s. Safe to assume empty.
            console.log(`[Scraper] Tabelul nu are coloane/date complete sau elcen.ro este gol pentru: ${dateStr}`);
            return null;
        }

        const data = await page.evaluate(() => {
            const rows = document.querySelectorAll('#table tr');
            return Array.from(rows).map(row => {
                const cells = row.querySelectorAll('td');
                return Array.from(cells).map(cell => cell.innerText.trim().replace(/\n/g, ' '));
            });
        });

        // Expected Columns from website: 
        // 0: Centrala, 1: Instalatie, 
        // 2: NOx raportat, 3: NOx Max, 
        // 4: SO2 raportat, 5: SO2 Max, 
        // 6: Pulberi raportat, 7: Pulberi Max, 
        // 8: CO raportat, 9: CO max

        // Helper pentru eliminarea diacriticelor și ignorarea literelor mari (ă -> a, ș -> s)
        const normalizeRoText = (str) => {
            return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        };

        // Find matching row
        let match = null;
        for (const row of data) {
            if (row.length < 10) continue;

            // Centrala matching - handle instances like "CTE Bucuresti Vest" vs "CTE VEST"
            // We take the last word of the search string (e.g., 'vest', 'sud', 'progresu', 'grozavesti')
            const searchParts = centralaSearch.trim().split(' ');
            const primaryKeyWord = normalizeRoText(searchParts[searchParts.length - 1]);
            
            const rowCentralaNormalized = normalizeRoText(row[0]);
            const isCentralaMatch = rowCentralaNormalized.includes(primaryKeyWord);

            if (!isCentralaMatch) continue;

            // If we have an aggregate search criteria, try to match it too.
            // (Often the site might name them differently, e.g. "IA 1 (C. nr. 2, 3, 4) - P")
            // We use a loose include
            if (instalatieSearch) {
                const searchLower = normalizeRoText(instalatieSearch).replace(/\s+/g, '');
                const siteInstalatieUpper = normalizeRoText(row[1]).replace(/\s+/g, '');

                if (siteInstalatieUpper.includes(searchLower) || searchLower.includes(siteInstalatieUpper)) {
                    match = row;
                    break;
                }
            } else {
                match = row;
                break;
            }
        }

        if (match) {
            return {
                rawSiteData: match,
                mapped: {
                    'Nox': parseFloat(match[2]),
                    'SO2': parseFloat(match[4]),
                    'Pulberi': parseFloat(match[6]),
                    'CO': parseFloat(match[8])
                }
            };
        }

        return null;

    } catch (err) {
        console.error(`[Scraper] Exception Error fetching Elcen data for ${dateStr}:`, err.message);
        
        // Daca firewall-ul a blocat, ori DNS-ul pica etc
        if (err.message.includes('timeout') || err.message.includes('Timeout') || err.message.includes('ERR_') || err.message.includes('Network')) {
            throw new Error(`CONNECTION_ERROR: ${err.message}`);
        }
        
        return null;
    } finally {
        if (page) await page.close(); // Only close the page, keep the browser alive
    }
};
