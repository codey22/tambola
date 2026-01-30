const { generateTicket } = require('./backend/utils/ticketGenerator');

const test = () => {
    let success = 0;
    const total = 1000;
    const start = Date.now();

    for (let i = 0; i < total; i++) {
        try {
            const ticket = generateTicket();
            // Basic validation
            let rowCounts = ticket.map(r => r.filter(n => n !== 0).length);
            if (rowCounts.some(c => c !== 5)) throw new Error("Row count mismatch");

            // Check cols
            let colCounts = Array(9).fill(0);
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 9; c++) {
                    if (ticket[r][c] !== 0) colCounts[c]++;
                }
            }
            if (colCounts.some(c => c === 0)) throw new Error("Empty column");

            success++;
        } catch (e) {
            console.error(e);
        }
    }

    const end = Date.now();
    console.log(`Generated ${success}/${total} valid tickets in ${end - start}ms`);
};

test();
