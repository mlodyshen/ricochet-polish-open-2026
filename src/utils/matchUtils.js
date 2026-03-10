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
    const bestOf = format === 'BO5' ? 5 : 3;
    return !isMatchFinished(currentScore.score1, currentScore.score2, bestOf);
};

// Helper to determine status
export const getMatchStatus = (match) => {
    if (match.winner_id) return 'finished';
    const bestOf = getBestOf(match.bracket || (match.bracket_type === 'wb' ? 'wb' : 'lb'));
    if (isMatchFinished(match.score1, match.score2, bestOf)) return 'finished';

    if (match.score1 > 0 || match.score2 > 0) return 'live';
    if (match.player1 && match.player2) return 'pending';
    return 'scheduled';
};

export const canEditMatch = (match) => {
    return match.player1 && match.player2 && !match.player1.isBye && !match.player2.isBye;
};

// --- SAFE SORTING (WB>LB>Placement) ---
export const compareMatchIds = (idA, idB) => {
    // 1. Parse IDs in detail
    const parseId = (id) => {
        if (id === 'grand-final') return { bracket: 'gf', round: 100, number: 1 };
        if (id === 'consolation-final') return { bracket: 'cf', round: 100, number: 1 };
        if (id === 'lb-final') return { bracket: 'lb', round: 99, number: 1 };

        const matchStd = id.match(/^([a-z0-9]+)-r(\d+)-m(\d+)$/);
        if (matchStd) {
            return {
                bracket: matchStd[1],
                round: parseInt(matchStd[2], 10),
                number: parseInt(matchStd[3], 10)
            };
        }
        const matchFin = id.match(/^([a-z0-9]+)-f$/);
        if (matchFin) return { bracket: matchFin[1], round: 99, number: 1 };

        return { bracket: id, round: 999, number: 999 };
    };

    const A = parseId(idA);
    const B = parseId(idB);

    // 2. Virtual Round Calculation (To fix ordering)
    const getVirtualRound = (item) => {
        let r = item.round;

        // PLACEMENT MATCHES (p9, p13...) happen way later, after people lose.
        // We push them to high numbers so they don't clog early queue.
        if (item.bracket.startsWith('p')) {
            return r + 50;
        }

        // GF/CF
        if (item.bracket === 'gf') return 100;
        if (item.bracket === 'cf') return 99;

        // WB and LB are treated as "equal" rounds for scheduling flow
        // But strictly playing LB R1 (1) before WB R2 (2) is usually better 
        // to move losers along.
        return r;
    };

    const phaseA = getVirtualRound(A);
    const phaseB = getVirtualRound(B);

    // 3. Sort by Virtual Round (Primary Sort Key)
    if (phaseA !== phaseB) return phaseA - phaseB;

    // 4. Tie-breaker: Bracket Priority (WB < LB < GF)
    // If rounds are equal (e.g. WB R1 vs LB R1), prioritize WB slightly?
    // Actually, usually we want to clear WB first if rounds are identical to populate LB.
    const getPriority = (b) => {
        if (b === 'wb') return 1;
        if (b === 'lb') return 2;
        return 10;
    };
    const pA = getPriority(A.bracket);
    const pB = getPriority(B.bracket);
    if (pA !== pB) return pA - pB;

    // 5. Compare Match Number
    return A.number - B.number;
};

// Calculate estimated times for a queue of matches
export const calculateEstimatedTimes = (matchesList) => {
    let currentMinutes = 8 * 60 + 30; // 08:30 start time
    let breakApplied = false;
    const matchTimes = {};

    matchesList.forEach(match => {
        if (!match || !match.id) return;

        // "mecz ktory wypada o 10:00 przesun o 5 min do przodu" -> apply a 5 min shift at or after 10:00 (600 mins) once
        if (currentMinutes >= 600 && !breakApplied) {
            currentMinutes += 5;
            breakApplied = true;
        }

        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeStr = `${h}:${m.toString().padStart(2, '0')}`;
        matchTimes[match.id] = timeStr;

        currentMinutes += 30; // each match takes ~30 minutes
    });

    return matchTimes;
};
