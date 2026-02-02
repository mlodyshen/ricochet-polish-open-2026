
// Helper: Static Seeding Order
// Helper: Static Seeding Order
// User requested: Match 1 is 1vs32, Match 2 is 2vs31...
const SEEDING_ORDER = [];
for (let i = 1; i <= 16; i++) {
    SEEDING_ORDER.push([i, 33 - i]);
}

// Helper: Define static structure of match sources
// Helper: Define static structure of match sources
// Helper: Define static structure of match sources
export const getBracketBlueprint = () => {
    const allMatches = [];

    // --- 1. WB R1 (16 Matches) - "FULL MIRROR" SEEDING ---
    // User Request: Match 1 (1vs32), Match 2 (2vs31)... Match 16 (16vs17)
    // Seeding: Top seeds 1-16 match against 32-17
    for (let i = 1; i <= 16; i++) {
        // Seeds are implied. Match mapping only here.
        allMatches.push({
            id: `wb-r1-m${i}`,
            round: 1,
            bracket: 'wb',
            // No strict source, it's seeding level
            sourceMatchId1: null, sourceType1: null,
            sourceMatchId2: null, sourceType2: null,
            nextMatchId: `wb-r2-m${Math.ceil(i / 2)}`
        });
    }

    // --- 2. WB R2 (8 Matches) ---
    // Standard progression: Winners of R1
    // Match 1 takes Winner M1 + Winner M2 (implied by sequential list 1-16)
    for (let i = 1; i <= 8; i++) {
        allMatches.push({
            id: `wb-r2-m${i}`,
            round: 2,
            bracket: 'wb',
            sourceMatchId1: `wb-r1-m${(i * 2) - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r1-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r3-m${Math.ceil(i / 2)}`
        });
    }

    // --- 3. WB R3 (4 Matches) ---
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `wb-r3-m${i}`,
            round: 3,
            bracket: 'wb',
            sourceMatchId1: `wb-r2-m${(i * 2) - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r2-m${i * 2}`, sourceType2: 'winner'
        });
    }

    // --- 4. LB R1 (8 Matches) - WB R1 Losers ---
    // Standard drop: M1 takes Loser WB M1 + Loser WB M2
    for (let i = 1; i <= 8; i++) {
        allMatches.push({
            id: `lb-r1-m${i}`,
            round: 1,
            bracket: 'lb',
            sourceMatchId1: `wb-r1-m${(i * 2) - 1}`, sourceType1: 'loser',
            sourceMatchId2: `wb-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `lb-r2-m${i}`
        });
    }

    // --- 5. LB R2 (8 Matches) - "BIG X" / VERTICAL INVERSION ---
    // Winners of LB R1 vs Losers of WB R2
    // Logic: WB R2 Losers are inverted.
    // Match i in LB R2 takes:
    //  - Source 1: Winner LB R1 Match i (Straight)
    //  - Source 2: Loser WB R2 Match (9 - i) (Inverted/Crossed)
    for (let i = 1; i <= 8; i++) {
        const invertedWbMatch = 9 - i;
        allMatches.push({
            id: `lb-r2-m${i}`,
            round: 2,
            bracket: 'lb',
            sourceMatchId1: `lb-r1-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r2-m${invertedWbMatch}`, sourceType2: 'loser'
        });
    }

    // --- 6. Further rounds (Placeholder/Standard for now to avoid errors) ---
    // LB R3 (4 Matches)
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `lb-r3-m${i}`, round: 3, bracket: 'lb',
            sourceMatchId1: `lb-r2-m${(i * 2) - 1}`, sourceType1: 'winner',
            sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'winner'
        });
    }

    return allMatches;
};

// MAIN LOGIC
export const rebuildBracketState = (players, existingMatchesMap = {}) => {
    // 1. Prepare Seeds
    const sortedPlayers = [...players].sort((a, b) => {
        const eloA = a.elo || 0;
        const eloB = b.elo || 0;
        if (eloA !== eloB) return eloB - eloA;
        return (a.full_name || "").localeCompare(b.full_name || "");
    });
    const seeds = [...sortedPlayers];
    while (seeds.length < 32) {
        seeds.push({ id: `bye-${seeds.length}`, full_name: "BYE", isBye: true });
    }

    // Map IDs for easy lookup (needed for BYE checks)
    const playerMap = new Map();
    seeds.forEach(p => playerMap.set(p.id, p));

    // 2. Blueprint
    const allMatches = getBracketBlueprint().map(m => ({
        ...m,
        score1: null, score2: null, microPoints: [], winnerId: null,
        player1Id: null, player2Id: null,
        status: 'scheduled'
    }));

    const matchMap = new Map();
    allMatches.forEach(m => matchMap.set(m.id, m));

    // 3. Hydrate WB R1
    const wbR1 = allMatches.filter(m => m.bracket === 'wb' && m.round === 1);
    wbR1.forEach((m, i) => {
        const pair = SEEDING_ORDER[i];
        m.player1Id = seeds[pair[0] - 1].id;
        m.player2Id = seeds[pair[1] - 1].id;
    });

    // 4. Sequential Processing
    const processingOrder = [
        ...allMatches.filter(m => m.bracket === 'wb').sort((a, b) => a.round - b.round),
        ...allMatches.filter(m => m.bracket === 'lb').sort((a, b) => a.round - b.round),
        ...allMatches.filter(m => m.bracket === 'gf'),
        // Placement Brackets
        ...allMatches.filter(m => m.bracket.startsWith('p')).sort((a, b) => {
            // Sort by bracket number (descending places effectively? No, round order matters)
            // Just round order is usually enough if we iterate, but we need dependencies.
            // p25 (R1) depends on lb-r1.
            // p25 (R2) depends on p25 (R1).
            // p17 (R1) depends on lb-r2.
            // So if we just sort by round it might work, but safer to respect dependency depth.
            // Simple generic sort:
            if (a.bracket !== b.bracket) return a.bracket.localeCompare(b.bracket);
            return a.round - b.round;
        })
    ];

    processingOrder.forEach(match => {
        // A. Resolve Players
        const resolveSource = (srcId, type) => {
            if (!srcId) return null;
            const src = matchMap.get(srcId);
            if (!src || !src.winnerId) return null;

            // Logic: Winner is winnerId. Loser is the other ID.
            const wId = src.winnerId;
            const lId = src.player1Id === wId ? src.player2Id : src.player1Id;

            return type === 'winner' ? wId : lId;
        };

        if (match.sourceMatchId1) {
            const pId = resolveSource(match.sourceMatchId1, match.sourceType1);
            if (pId) match.player1Id = pId;
        }
        if (match.sourceMatchId2) {
            const pId = resolveSource(match.sourceMatchId2, match.sourceType2);
            if (pId) match.player2Id = pId;
        }

        // B. Determine Status, Scores, Winner
        const existing = existingMatchesMap[match.id];

        // Auto-win BYEs
        const p1 = playerMap.get(match.player1Id);
        const p2 = playerMap.get(match.player2Id);
        const p1Bye = p1?.isBye;
        const p2Bye = p2?.isBye;

        let autoWinner = null;
        if (match.player1Id && match.player2Id) {
            if (p1Bye) autoWinner = match.player2Id;
            else if (p2Bye) autoWinner = match.player1Id;
        }

        if (autoWinner) {
            match.winnerId = autoWinner;
            match.score1 = autoWinner === match.player1Id ? 1 : 0;
            match.score2 = autoWinner === match.player2Id ? 1 : 0;
            match.status = 'finished';
        } else if (match.player1Id && match.player2Id && existing && (existing.score1 !== null || existing.score2 !== null)) {
            match.score1 = existing.score1;
            match.score2 = existing.score2;
            match.microPoints = existing.micro_points || [];

            // Determine Winner Logic (Respect Explicit or Calculate)
            // 1. Explicit winner from input (if stored)
            if (existing.winnerId) {
                match.winnerId = existing.winnerId;
            } else {
                // 2. Score Threshold Logic
                const bestOf = (match.bracket === 'wb' || match.bracket === 'gf') ? 5 : 3;
                const winThreshold = Math.ceil(bestOf / 2);

                if (match.score1 >= winThreshold) match.winnerId = match.player1Id;
                else if (match.score2 >= winThreshold) match.winnerId = match.player2Id;
            }

            match.status = match.winnerId ? 'finished' : 'live';
        } else {
            // Check readiness
            match.status = (match.player1Id && match.player2Id) ? 'pending' : 'scheduled';
        }
    });

    return processingOrder;
};

// EXPORTS
export const generateDoubleEliminationBracket = (players) => {
    return rebuildBracketState(players, {});
};

export const updateBracketMatch = (matches, matchId, score1, score2, microPoints = [], playersSource, winnerId = null, status = 'live') => {
    // 1. Scrape Results
    const resultsMap = {};
    matches.forEach(m => {
        if (m.score1 !== null || m.score2 !== null) {
            resultsMap[m.id] = {
                score1: m.score1,
                score2: m.score2,
                micro_points: m.microPoints,
                winnerId: m.winnerId,
                status: m.status
            };
        }
    });

    // 2. Update
    resultsMap[matchId] = {
        score1: parseInt(score1),
        score2: parseInt(score2),
        micro_points: microPoints,
        winnerId: winnerId,
        status: status
    };

    // 3. Rebuild - Use playersSource
    return rebuildBracketState(playersSource, resultsMap);
};

export const clearBracketMatch = (matches, matchId, playersSource) => {
    const resultsMap = {};
    matches.forEach(m => {
        if (m.id !== matchId && (m.score1 !== null || m.score2 !== null)) {
            resultsMap[m.id] = { score1: m.score1, score2: m.score2, micro_points: m.microPoints, winnerId: m.winnerId, status: m.status };
        }
    });
    return rebuildBracketState(playersSource, resultsMap);
};
