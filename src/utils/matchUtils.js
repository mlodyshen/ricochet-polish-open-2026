
// Helper to get BO format based on bracket type
export const getBestOf = (bracketType) => {
    if (bracketType === 'wb' || bracketType === 'gf') return 5; // BO5
    return 3; // BO3
};

// Helper to determine status
export const getMatchStatus = (match) => {
    if (match.winner_id) return 'finished';
    if (match.score1 > 0 || match.score2 > 0) return 'live';
    if (match.player1 && match.player2) return 'pending'; // Ready to play
    return 'scheduled'; // Waiting for players
};

export const canEditMatch = (match) => {
    return match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye;
};

// Helper to sort matches by ID (semantically: Bracket > Round > Match Number)
// IDs: wb-r1-m1, lb-r2-m10, gf-m1, etc.
export const compareMatchIds = (idA, idB) => {
    // 1. Parse IDs
    const parseId = (id) => {
        // pattern: (bracket)-r(round)-m(match) OR (bracket)-m(match) [for gf]
        const match = id.match(/^([a-z]+)(?:-r(\d+))?-m(\d+)$/);
        if (!match) return { bracket: id, round: 999, number: 999 };

        return {
            bracket: match[1],
            round: match[2] ? parseInt(match[2], 10) : (match[1] === 'gf' ? 100 : 0), // GF treated as late round
            number: parseInt(match[3], 10)
        };
    };

    const A = parseId(idA);
    const B = parseId(idB);

    // 2. Compare Bracket Priority (WB < LB < GF)
    const bracketPriority = { wb: 1, lb: 2, gf: 3 };
    const pA = bracketPriority[A.bracket] || 99;
    const pB = bracketPriority[B.bracket] || 99;

    if (pA !== pB) return pA - pB;

    // 3. Compare Round
    if (A.round !== B.round) return A.round - B.round;

    // 4. Compare Match Number
    return A.number - B.number;
};
