// Helper: Static Seeding Order - Professional Layout
const SEEDING_ORDER = [
    [1, 32],   // Match 1
    [16, 17],  // Match 2
    [9, 24],   // Match 3
    [8, 25],   // Match 4
    [5, 28],   // Match 5
    [12, 21],  // Match 6
    [13, 20],  // Match 7
    [4, 29],   // Match 8
    [3, 30],   // Match 9
    [14, 19],  // Match 10
    [11, 22],  // Match 11
    [6, 27],   // Match 12
    [7, 26],   // Match 13
    [10, 23],  // Match 14
    [15, 18],  // Match 15 (Zaborowska)
    [2, 31]    // Match 16
];

// MANUAL MAPS
const LB_R1_MAP = [
    { id: 'lb-r1-m1', wb1: 'wb-r1-m1', wb2: 'wb-r1-m2' }, // Top
    { id: 'lb-r1-m2', wb1: 'wb-r1-m3', wb2: 'wb-r1-m4' },
    { id: 'lb-r1-m3', wb1: 'wb-r1-m5', wb2: 'wb-r1-m6' },
    { id: 'lb-r1-m4', wb1: 'wb-r1-m7', wb2: 'wb-r1-m8' },
    { id: 'lb-r1-m5', wb1: 'wb-r1-m9', wb2: 'wb-r1-m10' },
    { id: 'lb-r1-m6', wb1: 'wb-r1-m11', wb2: 'wb-r1-m12' },
    { id: 'lb-r1-m7', wb1: 'wb-r1-m13', wb2: 'wb-r1-m14' },
    { id: 'lb-r1-m8', wb1: 'wb-r1-m15', wb2: 'wb-r1-m16' } // Bottom - Zaborowska
];

const LB_R2_MAP = [
    // Cross: Top WB R2 (M1) -> Bottom LB R2 (M4). Bottom WB R2 (M4) -> Top LB R2 (M1)
    { id: 'lb-r2-m1', lbPrev: 'lb-r1-m1', wbDrop: 'wb-r2-m4' },
    { id: 'lb-r2-m2', lbPrev: 'lb-r1-m2', wbDrop: 'wb-r2-m3' },
    { id: 'lb-r2-m3', lbPrev: 'lb-r1-m3', wbDrop: 'wb-r2-m2' },
    { id: 'lb-r2-m4', lbPrev: 'lb-r1-m4', wbDrop: 'wb-r2-m1' },
    // Next block
    { id: 'lb-r2-m5', lbPrev: 'lb-r1-m5', wbDrop: 'wb-r2-m8' },
    { id: 'lb-r2-m6', lbPrev: 'lb-r1-m6', wbDrop: 'wb-r2-m7' },
    { id: 'lb-r2-m7', lbPrev: 'lb-r1-m7', wbDrop: 'wb-r2-m6' },
    { id: 'lb-r2-m8', lbPrev: 'lb-r1-m8', wbDrop: 'wb-r2-m5' }
];

const LB_R4_MAP = [
    // Standard Shift/Cross for R3 losers
    // LB R3 M1-4 winners meet WB R3 losers (M1-4)
    // Map: 1->3, 2->4, 3->1, 4->2 (block cross)
    { id: 'lb-r4-m1', lbPrev: 'lb-r3-m1', wbDrop: 'wb-r3-m3' },
    { id: 'lb-r4-m2', lbPrev: 'lb-r3-m2', wbDrop: 'wb-r3-m4' },
    { id: 'lb-r4-m3', lbPrev: 'lb-r3-m3', wbDrop: 'wb-r3-m1' },
    { id: 'lb-r4-m4', lbPrev: 'lb-r3-m4', wbDrop: 'wb-r3-m2' }
];

const LB_R6_MAP = [
    // Direct Mirror (User Req: Top->Top, Bottom->Bottom)
    { id: 'lb-r6-m1', lbPrev: 'lb-r5-m1', wbDrop: 'wb-r4-m1' },
    { id: 'lb-r6-m2', lbPrev: 'lb-r5-m2', wbDrop: 'wb-r4-m2' }
];

export const getBracketBlueprint = () => {
    const allMatches = [];

    // --- WB R1 ---
    for (let i = 1; i <= 16; i++) {
        allMatches.push({ id: `wb-r1-m${i}`, round: 1, bracket: 'wb', nextMatchId: `wb-r2-m${Math.ceil(i / 2)}` });
    }
    // --- WB R2 ---
    for (let i = 1; i <= 8; i++) {
        allMatches.push({ id: `wb-r2-m${i}`, round: 2, bracket: 'wb', sourceMatchId1: `wb-r1-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `wb-r1-m${i * 2}`, sourceType2: 'winner', nextMatchId: `wb-r3-m${Math.ceil(i / 2)}` });
    }
    // --- WB R3 ---
    for (let i = 1; i <= 4; i++) {
        allMatches.push({ id: `wb-r3-m${i}`, round: 3, bracket: 'wb', sourceMatchId1: `wb-r2-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `wb-r2-m${i * 2}`, sourceType2: 'winner', nextMatchId: `wb-r4-m${Math.ceil(i / 2)}` });
    }
    // --- WB R4 ---
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `wb-r4-m${i}`, round: 4, bracket: 'wb', sourceMatchId1: `wb-r3-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `wb-r3-m${i * 2}`, sourceType2: 'winner', nextMatchId: `wb-r5-m1` });
    }
    // --- WB R5 ---
    allMatches.push({ id: `wb-r5-m1`, round: 5, bracket: 'wb', sourceMatchId1: `wb-r4-m1`, sourceType1: 'winner', sourceMatchId2: `wb-r4-m2`, sourceType2: 'winner', nextMatchId: `gf-m1` });

    // --- LB R1 ---
    LB_R1_MAP.forEach(m => {
        allMatches.push({ id: m.id, round: 1, bracket: 'lb', sourceMatchId1: m.wb1, sourceType1: 'loser', sourceMatchId2: m.wb2, sourceType2: 'loser', nextMatchId: m.id.replace('r1', 'r2') });
    });

    // --- LB R2 ---
    LB_R2_MAP.forEach(m => {
        allMatches.push({ id: m.id, round: 2, bracket: 'lb', sourceMatchId1: m.lbPrev, sourceType1: 'winner', sourceMatchId2: m.wbDrop, sourceType2: 'loser', nextMatchId: `lb-r3-m${Math.ceil(parseInt(m.id.split('-m')[1]) / 2)}` });
    });

    // --- LB R3 ---
    for (let i = 1; i <= 4; i++) {
        allMatches.push({ id: `lb-r3-m${i}`, round: 3, bracket: 'lb', sourceMatchId1: `lb-r2-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'winner', nextMatchId: `lb-r4-m${i}` });
    }

    // --- LB R4 ---
    LB_R4_MAP.forEach(m => {
        allMatches.push({ id: m.id, round: 4, bracket: 'lb', sourceMatchId1: m.lbPrev, sourceType1: 'winner', sourceMatchId2: m.wbDrop, sourceType2: 'loser', nextMatchId: `lb-r5-m${Math.ceil(parseInt(m.id.split('-m')[1]) / 2)}` });
    });

    // --- LB R5 ---
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `lb-r5-m${i}`, round: 5, bracket: 'lb', sourceMatchId1: `lb-r4-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `lb-r4-m${i * 2}`, sourceType2: 'winner', nextMatchId: `lb-r6-m${i}` });
    }

    // --- LB R6 ---
    LB_R6_MAP.forEach(m => {
        allMatches.push({ id: m.id, round: 6, bracket: 'lb', sourceMatchId1: m.lbPrev, sourceType1: 'winner', sourceMatchId2: m.wbDrop, sourceType2: 'loser', nextMatchId: `lb-r7-m1` });
    });

    // --- LB R7 ---
    allMatches.push({ id: `lb-r7-m1`, round: 7, bracket: 'lb', sourceMatchId1: `lb-r6-m1`, sourceType1: 'winner', sourceMatchId2: `lb-r6-m2`, sourceType2: 'winner', nextMatchId: `gf-m1` });

    // --- GF ---
    allMatches.push({ id: `gf-m1`, round: 1, bracket: 'gf', sourceMatchId1: `wb-r5-m1`, sourceType1: 'winner', sourceMatchId2: `lb-r7-m1`, sourceType2: 'winner' });

    // --- PLACEMENT BRACKETS (ORANGE) ---
    // Places 5-8 (WB R3 Losers)
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p5-r1-m${i}`, bracket: 'p5', round: 1, sourceMatchId1: `wb-r3-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `wb-r3-m${i * 2}`, sourceType2: 'loser' });
    }
    allMatches.push({ id: `p5-f`, bracket: 'p5', round: 2, sourceMatchId1: `p5-r1-m1`, sourceType1: 'winner', sourceMatchId2: `p5-r1-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p7-f`, bracket: 'p5', round: 2, sourceMatchId1: `p5-r1-m1`, sourceType1: 'loser', sourceMatchId2: `p5-r1-m2`, sourceType2: 'loser' });

    // Places 9-16
    // P9-12 (LB R4 Losers)
    for (let i = 1; i <= 2; i++) allMatches.push({ id: `p9-r1-m${i}`, bracket: 'p9', round: 1, sourceMatchId1: `lb-r4-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `lb-r4-m${i * 2}`, sourceType2: 'loser' });
    allMatches.push({ id: `p9-f`, bracket: 'p9', round: 2, sourceMatchId1: `p9-r1-m1`, sourceType1: 'winner', sourceMatchId2: `p9-r1-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p11-f`, bracket: 'p9', round: 2, sourceMatchId1: `p9-r1-m1`, sourceType1: 'loser', sourceMatchId2: `p9-r1-m2`, sourceType2: 'loser' });

    // P13-16 (LB R3 Losers)
    for (let i = 1; i <= 2; i++) allMatches.push({ id: `p13-r1-m${i}`, bracket: 'p13', round: 1, sourceMatchId1: `lb-r3-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `lb-r3-m${i * 2}`, sourceType2: 'loser' });
    allMatches.push({ id: `p13-f`, bracket: 'p13', round: 2, sourceMatchId1: `p13-r1-m1`, sourceType1: 'winner', sourceMatchId2: `p13-r1-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p15-f`, bracket: 'p13', round: 2, sourceMatchId1: `p13-r1-m1`, sourceType1: 'loser', sourceMatchId2: `p13-r1-m2`, sourceType2: 'loser' });

    // Places 17-32
    // P17-24 (LB R2 Losers)
    for (let i = 1; i <= 4; i++) {
        allMatches.push({ id: `p17-r1-m${i}`, bracket: 'p17', round: 1, sourceMatchId1: `lb-r2-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'loser', nextMatchId: `p17-r2-m${Math.ceil(i / 2)}` });
    }
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p17-r2-m${i}`, bracket: 'p17', round: 2, sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'winner' });
        allMatches.push({ id: `p21-r2-m${i}`, bracket: 'p21', round: 2, sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'loser' });
    }
    allMatches.push({ id: `p17-f`, bracket: 'p17', round: 3, sourceMatchId1: `p17-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p17-r2-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p19-f`, bracket: 'p19', round: 3, sourceMatchId1: `p17-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p17-r2-m2`, sourceType2: 'loser' });
    allMatches.push({ id: `p21-f`, bracket: 'p21', round: 3, sourceMatchId1: `p21-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p21-r2-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p23-f`, bracket: 'p23', round: 3, sourceMatchId1: `p21-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p21-r2-m2`, sourceType2: 'loser' });

    // P25-32 (LB R1 Losers)
    for (let i = 1; i <= 4; i++) {
        allMatches.push({ id: `p25-r1-m${i}`, bracket: 'p25', round: 1, sourceMatchId1: `lb-r1-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `lb-r1-m${i * 2}`, sourceType2: 'loser', nextMatchId: `p25-r2-m${Math.ceil(i / 2)}` });
    }
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p25-r2-m${i}`, bracket: 'p25', round: 2, sourceMatchId1: `p25-r1-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `p25-r1-m${i * 2}`, sourceType2: 'winner' });
        allMatches.push({ id: `p29-r2-m${i}`, bracket: 'p29', round: 2, sourceMatchId1: `p25-r1-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `p25-r1-m${i * 2}`, sourceType2: 'loser' });
    }
    allMatches.push({ id: `p25-f`, bracket: 'p25', round: 3, sourceMatchId1: `p25-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p25-r2-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p27-f`, bracket: 'p27', round: 3, sourceMatchId1: `p25-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p25-r2-m2`, sourceType2: 'loser' });
    allMatches.push({ id: `p29-f`, bracket: 'p29', round: 3, sourceMatchId1: `p29-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p29-r2-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p31-f`, bracket: 'p31', round: 3, sourceMatchId1: `p29-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p29-r2-m2`, sourceType2: 'loser' });

    return allMatches;
};

// --- Rebuild Logic ---
export const rebuildBracketState = (players, existingMatchesMap = {}) => {
    // 1. Seeds
    const sortedPlayers = [...players].sort((a, b) => {
        const eloA = parseInt(a.elo || 0);
        const eloB = parseInt(b.elo || 0);
        if (eloA !== eloB) return eloB - eloA;
        return (a.full_name || "").localeCompare(b.full_name || "");
    });
    const seeds = [...sortedPlayers];
    while (seeds.length < 32) seeds.push({ id: `bye-${seeds.length}`, full_name: "BYE", isBye: true });

    const playerMap = new Map();
    seeds.forEach(p => playerMap.set(p.id, p));

    // 2. Init all
    const allMatches = getBracketBlueprint().map(m => ({
        ...m,
        score1: null, score2: null, microPoints: [], winnerId: null, player1Id: null, player2Id: null, status: 'scheduled'
    }));
    const matchMap = new Map();
    allMatches.forEach(m => matchMap.set(m.id, m));

    // 3. Hydrate WB R1
    const wbR1 = allMatches.filter(m => m.bracket === 'wb' && m.round === 1);
    wbR1.forEach((m, i) => {
        const pair = SEEDING_ORDER[i];
        if (seeds[pair[0] - 1]) m.player1Id = seeds[pair[0] - 1].id;
        if (seeds[pair[1] - 1]) m.player2Id = seeds[pair[1] - 1].id;
    });

    // 4. Processing Order
    const processingOrder = [
        ...allMatches.filter(m => m.bracket === 'wb').sort((a, b) => a.round - b.round),
        ...allMatches.filter(m => m.bracket === 'lb').sort((a, b) => a.round - b.round),
        ...allMatches.filter(m => m.bracket === 'gf'),
        ...allMatches.filter(m => m.bracket.startsWith('p'))
    ];

    // 5. Evaluate
    processingOrder.forEach(match => {
        const resolveSource = (srcId, type) => {
            if (!srcId) return null;
            const src = matchMap.get(srcId);
            if (!src || !src.winnerId) return null;
            const isW1 = src.winnerId === src.player1Id;
            return type === 'winner' ? src.winnerId : (isW1 ? src.player2Id : src.player1Id);
        };
        if (match.sourceMatchId1) {
            const pid = resolveSource(match.sourceMatchId1, match.sourceType1);
            if (pid) match.player1Id = pid;
        }
        if (match.sourceMatchId2) {
            const pid = resolveSource(match.sourceMatchId2, match.sourceType2);
            if (pid) match.player2Id = pid;
        }

        // Apply Results
        const existing = existingMatchesMap[match.id];
        let autoWinner = null;
        const p1 = playerMap.get(match.player1Id);
        const p2 = playerMap.get(match.player2Id);
        if (match.player1Id && match.player2Id) {
            if (p1?.isBye) autoWinner = match.player2Id;
            else if (p2?.isBye) autoWinner = match.player1Id;
        }

        if (autoWinner) {
            match.winnerId = autoWinner;
            match.score1 = autoWinner === match.player1Id ? 1 : 0;
            match.score2 = autoWinner === match.player2Id ? 1 : 0;
            match.status = 'finished';
        } else if (existing && (existing.score1 !== null || existing.score2 !== null)) {
            match.score1 = existing.score1;
            match.score2 = existing.score2;
            match.microPoints = existing.micro_points || [];
            if (existing.winnerId) match.winnerId = existing.winnerId;
            else {
                const bestOf = (match.bracket === 'wb' || match.bracket === 'gf' || match.bracket.endsWith('f')) ? 5 : 3;
                const thresh = Math.ceil(bestOf / 2);
                if (match.score1 >= thresh) match.winnerId = match.player1Id;
                else if (match.score2 >= thresh) match.winnerId = match.player2Id;
            }
            match.status = match.winnerId ? 'finished' : 'live';
        } else {
            match.status = (match.player1Id && match.player2Id) ? 'pending' : 'scheduled';
        }
    });

    return processingOrder;
};

export const generateDoubleEliminationBracket = (players) => rebuildBracketState(players, {});

export const updateBracketMatch = (matches, matchId, score1, score2, microPoints = [], playersSource, winnerId = null, status = 'live') => {
    const resultsMap = {};
    matches.forEach(m => {
        if (m.score1 !== null || m.score2 !== null) {
            resultsMap[m.id] = { score1: m.score1, score2: m.score2, micro_points: m.microPoints, winnerId: m.winnerId, status: m.status };
        }
    });
    resultsMap[matchId] = { score1: Number(score1) || 0, score2: Number(score2) || 0, micro_points: microPoints, winnerId, status };
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
