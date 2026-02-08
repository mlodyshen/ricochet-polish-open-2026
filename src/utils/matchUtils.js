// Helper to get BO format based on bracket type
export const getBestOf = (bracketType) => {
    if (bracketType === 'wb' || bracketType === 'gf') return 5; // BO5
    return 3; // BO3
};

// Check if match is finished based on scores and BO format
export const isMatchFinished = (score1, score2, bestOf) => {
    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    const winThreshold = Math.ceil(bestOf / 2);
    return s1 >= winThreshold || s2 >= winThreshold;
};

// Returns TRUE if match is still running (Live), FALSE if finished
export const checkMatchStatus = (currentScore, format) => {
    // currentScore can be object { score1, score2 } or just number of wins if passed simpler
    const bestOf = format === 'BO5' ? 5 : 3;
    return !isMatchFinished(currentScore.score1, currentScore.score2, bestOf);
};

// Helper to determine status
export const getMatchStatus = (match) => {
    if (match.winner_id) return 'finished';

    // Updated Logic: Check strict win condition
    const bestOf = getBestOf(match.bracket || (match.bracket_type === 'wb' ? 'wb' : 'lb'));
    if (isMatchFinished(match.score1, match.score2, bestOf)) {
        return 'finished';
    }

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

    // 2. Compare Round (Primary Sort Key for Flow)
    // Matches should be played round by round ideally
    if (A.round !== B.round) return A.round - B.round;

    // 3. Compare Bracket Priority (WB < LB < GF)
    const bracketPriority = { wb: 1, lb: 2, gf: 3 };
    const pA = bracketPriority[A.bracket] || 99;
    const pB = bracketPriority[B.bracket] || 99;

    if (pA !== pB) return pA - pB;

    // 4. Compare Match Number
    return A.number - B.number;
};
