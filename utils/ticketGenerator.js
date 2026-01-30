const generateTicket = () => {
    // 3 rows, 9 cols, initialized with 0
    let ticket = Array(3).fill().map(() => Array(9).fill(0));
    
    // Column ranges: 0:1-9, 1:10-19, ... 8:80-90 (Note col 8 has 11 nums)
    const getColRange = (colIndex) => {
        if (colIndex === 0) return { min: 1, max: 9 };
        if (colIndex === 8) return { min: 80, max: 90 };
        return { min: colIndex * 10, max: colIndex * 10 + 9 };
    };

    // Helper to get random unique numbers from a range
    const getRandomNumbers = (count, min, max) => {
        const nums = new Set();
        while(nums.size < count) {
            nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return Array.from(nums).sort((a,b) => a-b);
    };

    // Strategy:
    // 1. We have 15 numbers total.
    // 2. Each of the 9 columns must have at least 1 number.
    // 3. Each row must have exactly 5 numbers.
    
    // Step 1: Decide how many numbers per column.
    // Start with 1 per column (total 9).
    // distribute remaining 6 numbers to columns randomly, max 3 total per column.
    let colCounts = Array(9).fill(1);
    let remaining = 6;
    while (remaining > 0) {
        let col = Math.floor(Math.random() * 9);
        if (colCounts[col] < 3) { // Max 3 per column (since 3 rows)
            colCounts[col]++;
            remaining--;
        }
    }

    // Step 2: Assign numbers to the grid based on colCounts
    // This is tricky: we also need to ensure row counts are exactly 5.
    // A simple backtracking or randomized retry approach is often easiest for Sudoku/Tambola.
    
    // Let's try randomized placement with validation loop.
    let success = false;
    while (!success) {
        ticket = Array(3).fill().map(() => Array(9).fill(0));
        let rowCounts = [0, 0, 0];
        let currentTicketCols = [...colCounts]; // copy of target counts
        
        // We will place 'currentTicketCols[c]' numbers in column 'c' 
        // distributed across rows such that no row exceeds 5.
        
        // Actually, let's process column by column.
        // For column c, we need to place currentTicketCols[c] numbers.
        // We must choose which rows to put them in.
        // Constraint: Row must not be full (5).
        
        /* 
           This is a constraint satisfaction problem. 
           Cols 0..8 have target counts C0..C8.
           Rows 0..2 have capacity 5.
           Matrix M[3][9] (binary), sum(M[r]) = 5, sum(M[c]) = C_c.
        */
       
       // Try verify logic:
       // Create an empty structure.
       // For each column, pick 'count' unique random rows.
       // Check if rows are balanced (<=5). If not, retry distribution.
       // This might be bias but is fast.
       
       let finalStructure = Array(3).fill().map(() => Array(9).fill(0));
       let validStructure = true;
       // Temp row counts
       let rCounts = [0,0,0];

       for (let c = 0; c < 9; c++) {
           let count = colCounts[c];
           // Pick 'count' unique rows for this column 
           // Prioritize rows with lower current counts to balance? 
           // Simple random shuffle of [0,1,2].slice(0, count) might create imbalance.
           // Let's just try random and restart if fail.
           let rows = [0,1,2].sort(() => Math.random() - 0.5).slice(0, count);
           
           rows.forEach(r => {
               finalStructure[r][c] = 1;
               rCounts[r]++;
           });
       }

       if (rCounts[0] === 5 && rCounts[1] === 5 && rCounts[2] === 5) {
           // Success structure!
           // Now fill with numbers
           for (let c = 0; c < 9; c++) {
               let range = getColRange(c);
               let nums = getRandomNumbers(colCounts[c], range.min, range.max);
               let numIdx = 0;
               for (let r = 0; r < 3; r++) {
                   if (finalStructure[r][c] === 1) {
                       ticket[r][c] = nums[numIdx++];
                   }
               }
           }
           success = true;
       }
       // Else retry the structure generation inside the loop
    }
    
    return ticket;
};

module.exports = { generateTicket };
