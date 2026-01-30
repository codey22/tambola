const checkPatterns = (ticket, calledNumbersSet) => {
    // ticket is 3x9 grid with numbers or 0
    // calledNumbersSet is a Set or Array of numbers called so far.
    // Ensure set for O(1)
    const calledSet = new Set(calledNumbersSet);

    // Get all numbers in ticket
    const ticketNumbers = ticket.flat().filter(n => n !== 0);
    const markedNumbers = ticketNumbers.filter(n => calledSet.has(n));

    // 1. Early Five
    const earlyFive = markedNumbers.length >= 5;

    // Helper to check row
    const checkRow = (rowIndex) => {
        const rowNums = ticket[rowIndex].filter(n => n !== 0);
        return rowNums.length > 0 && rowNums.every(n => calledSet.has(n));
    };

    const topRow = checkRow(0);
    const middleRow = checkRow(1);
    const bottomRow = checkRow(2);

    // 2. Full House
    const fullHouse = ticketNumbers.every(n => calledSet.has(n));

    // 3. Four Corners
    // Definition: First and Last number of Top Row AND First and Last number of Bottom Row.
    const getCorners = (rowIndex) => {
        const row = ticket[rowIndex];
        const nums = row.filter(n => n !== 0);
        if (nums.length < 2) return null; // Should not happen in standard ticket
        return [nums[0], nums[nums.length - 1]];
    };

    let fourCorners = false;
    const topCorners = getCorners(0);
    const bottomCorners = getCorners(2);

    if (topCorners && bottomCorners) {
        fourCorners = topCorners.every(n => calledSet.has(n)) &&
            bottomCorners.every(n => calledSet.has(n));
    }

    return {
        earlyFive,
        topRow,
        middleRow,
        bottomRow,
        fullHouse,
        fourCorners
    };
};

module.exports = { checkPatterns };
