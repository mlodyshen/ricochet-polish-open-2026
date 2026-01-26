
// Helper: Static Seeding Order
const SEEDING_ORDER = [
    [1, 32], [16, 17], [9, 24], [8, 25],
    [5, 28], [12, 21], [13, 20], [4, 29],
    [3, 30], [14, 19], [11, 22], [6, 27],
    [7, 26], [10, 23], [15, 18], [2, 31]
];

// Helper: Define static structure of match sources
const getBracketBlueprint = () => {
    const allMatches = [];

    // WB (5 Rounds)
    [16, 8, 4, 2, 1].forEach((count, rIdx) => {
        const round = rIdx + 1;
        for (let m = 1; m <= count; m++) {
            allMatches.push({ id: `wb-r${round}-m${m}`, round: round, bracket: 'wb', sourceMatchId1: null, sourceType1: null, sourceMatchId2: null, sourceType2: null });
        }
    });
    // LB (8 Rounds)
    const lbCounts = [8, 8, 4, 4, 2, 2, 1, 1];
    lbCounts.forEach((count, rIdx) => {
        const round = rIdx + 1;
        for (let m = 1; m <= count; m++) {
            allMatches.push({ id: `lb-r${round}-m${m}`, round: round, bracket: 'lb', sourceMatchId1: null, sourceType1: null, sourceMatchId2: null, sourceType2: null });
        }
    });
    // GF
    allMatches.push({ id: 'gf-m1', round: 1, bracket: 'gf' });
    allMatches.push({ id: 'gf-m2', round: 2, bracket: 'gf' });

    // --- DEFINE SOURCES ---
    // WB R2-R5 (Winner Sources)
    for (let r = 2; r <= 5; r++) {
        const matches = allMatches.filter(m => m.bracket === 'wb' && m.round === r);
        matches.forEach((m, i) => {
            m.sourceMatchId1 = `wb-r${r - 1}-m${i * 2 + 1}`; m.sourceType1 = 'winner';
            m.sourceMatchId2 = `wb-r${r - 1}-m${i * 2 + 2}`; m.sourceType2 = 'winner';
        });
    }

    // LB Sources (Standard DE Logic)
    // LB R1
    allMatches.filter(m => m.bracket === 'lb' && m.round === 1).forEach((m, i) => {
        m.sourceMatchId1 = `wb-r1-m${i * 2 + 1}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `wb-r1-m${i * 2 + 2}`; m.sourceType2 = 'loser';
    });
    // LB R2
    allMatches.filter(m => m.bracket === 'lb' && m.round === 2).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r1-m${i + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `wb-r2-m${8 - i}`; m.sourceType2 = 'loser';
    });
    // LB R3
    allMatches.filter(m => m.bracket === 'lb' && m.round === 3).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r2-m${i * 2 + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `lb-r2-m${i * 2 + 2}`; m.sourceType2 = 'winner';
    });
    // LB R4
    allMatches.filter(m => m.bracket === 'lb' && m.round === 4).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r3-m${i + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `wb-r3-m${4 - i}`; m.sourceType2 = 'loser';
    });
    // LB R5
    allMatches.filter(m => m.bracket === 'lb' && m.round === 5).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r4-m${i * 2 + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `lb-r4-m${i * 2 + 2}`; m.sourceType2 = 'winner';
    });
    // LB R6
    allMatches.filter(m => m.bracket === 'lb' && m.round === 6).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r5-m${i + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `wb-r4-m${2 - i}`; m.sourceType2 = 'loser';
    });
    // LB R7
    allMatches.filter(m => m.bracket === 'lb' && m.round === 7).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r6-m1`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `lb-r6-m2`; m.sourceType2 = 'winner';
    });
    // LB R8
    allMatches.filter(m => m.bracket === 'lb' && m.round === 8).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r7-m1`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `wb-r5-m1`; m.sourceType2 = 'loser';
    });
    // GF
    const gf1 = allMatches.find(m => m.id === 'gf-m1');
    if (gf1) {
        gf1.sourceMatchId1 = `wb-r5-m1`; gf1.sourceType1 = 'winner';
        gf1.sourceMatchId2 = `lb-r8-m1`; gf1.sourceType2 = 'winner';
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
        ...allMatches.filter(m => m.bracket === 'gf')
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
            match.microPoints = existing.micro_points || []; // Keep consistent naming check? User said microPoints in camelCase earlier or snake? "match = {...}" list didn't specify. I'll stick to camelCase `microPoints` internal, map if needed.
            // Wait, useMatches saves as is. 
            // I'll use `microPoints` here.

            if (match.score1 > match.score2) match.winnerId = match.player1Id;
            else if (match.score2 > match.score1) match.winnerId = match.player2Id;

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

export const updateBracketMatch = (matches, matchId, score1, score2, microPoints = [], playersSource) => {
    // 1. Scrape Results
    const resultsMap = {};
    matches.forEach(m => {
        if (m.score1 !== null || m.score2 !== null) {
            resultsMap[m.id] = { score1: m.score1, score2: m.score2, micro_points: m.microPoints };
        }
    });
    // 2. Update
    resultsMap[matchId] = { score1: parseInt(score1), score2: parseInt(score2), micro_points: microPoints };

    // 3. Rebuild - Use playersSource
    // We assume playersSource is valid.
    return rebuildBracketState(playersSource, resultsMap);
};

export const clearBracketMatch = (matches, matchId, playersSource) => {
    const resultsMap = {};
    matches.forEach(m => {
        if (m.id !== matchId && (m.score1 !== null || m.score2 !== null)) {
            resultsMap[m.id] = { score1: m.score1, score2: m.score2, micro_points: m.microPoints };
        }
    });
    return rebuildBracketState(playersSource, resultsMap);
};
