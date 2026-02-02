// Helper: Static Seeding Order - Professional Layout
// Order: [1,32], [16,17], [9,24], [8,25], [5,28], [12,21], [13,20], [4,29], [3,30], [14,19], [11,22], [6,27], [7,26], [10,23], [15,18], [2,31]
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

export const getBracketBlueprint = () => {
    const allMatches = [];

    // --- WB R1 (16 Matches) ---
    for (let i = 1; i <= 16; i++) {
        allMatches.push({
            id: `wb-r1-m${i}`, round: 1, bracket: 'wb',
            nextMatchId: `wb-r2-m${Math.ceil(i / 2)}`
        });
    }

    // --- WB R2 (8 Matches) ---
    for (let i = 1; i <= 8; i++) {
        allMatches.push({
            id: `wb-r2-m${i}`, round: 2, bracket: 'wb',
            sourceMatchId1: `wb-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r1-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r3-m${Math.ceil(i / 2)}`
        });
    }

    // --- WB R3 (4 Matches) - Quarterfinals ---
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `wb-r3-m${i}`, round: 3, bracket: 'wb',
            sourceMatchId1: `wb-r2-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r2-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r4-m${Math.ceil(i / 2)}`
        });
    }

    // --- WB R4 (2 Matches) - Semifinals ---
    for (let i = 1; i <= 2; i++) {
        allMatches.push({
            id: `wb-r4-m${i}`, round: 4, bracket: 'wb',
            sourceMatchId1: `wb-r3-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r3-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `wb-r5-m1`
        });
    }

    // --- WB R5 (1 Match) - Final (Upper Bracket) ---
    allMatches.push({
        id: `wb-r5-m1`, round: 5, bracket: 'wb',
        sourceMatchId1: `wb-r4-m1`, sourceType1: 'winner',
        sourceMatchId2: `wb-r4-m2`, sourceType2: 'winner',
        nextMatchId: `gf-m1`
    });

    // --- LB R1 (8 Matches) - WB R1 Losers (HARDCODED LINEAR) ---
    // User Requirement: 1:1 Mapping.
    // WB M1 & M2 -> LB M1 (Top)
    // WB M15 & M16 -> LB M8 (Bottom) - Ensures Zaborowska (WB M15) goes to Bottom LB.
    const lbR1Map = [
        { lb: 1, wb1: 1, wb2: 2 },
        { lb: 2, wb1: 3, wb2: 4 },
        { lb: 3, wb1: 5, wb2: 6 },
        { lb: 4, wb1: 7, wb2: 8 },
        { lb: 5, wb1: 9, wb2: 10 },
        { lb: 6, wb1: 11, wb2: 12 },
        { lb: 7, wb1: 13, wb2: 14 },
        { lb: 8, wb1: 15, wb2: 16 }, // Zaborowska (WB15) here
    ];

    lbR1Map.forEach(map => {
        allMatches.push({
            id: `lb-r1-m${map.lb}`, round: 1, bracket: 'lb',
            sourceMatchId1: `wb-r1-m${map.wb1}`, sourceType1: 'loser',
            sourceMatchId2: `wb-r1-m${map.wb2}`, sourceType2: 'loser',
            nextMatchId: `lb-r2-m${map.lb}`
        });
    });

    // --- LB R2 (8 Matches) - WB R2 Losers (CROSS / BIG X) ---
    // Requirement:
    // WB Matches I, J, K, L are WB R2 M1, M2, M3, M4? No.
    // WB Matches A-H are R1. I-L are R2. Wait.
    // WB R1 has 16 matches (A-P).
    // WB R2 has 8 matches.
    // User Schema shows letters I, J, K, L... wait.
    // Schema: 
    // Left side:
    // A (1/32) -> W goes to I.
    // B (16/17) -> W goes to I? No. A and B feed I? Standard is M1+M2->M1.
    // Assuming standard WB structure.
    // LB R2 logic from user: "Przegrany z WB R2 (I, J, K, L) spadają do LB R2".
    // "Przegrany z górnego WB R2 (L) trafia do dolnej LB R2".
    // "Przegrany z dolnego WB R2 (I) trafia do górnej LB R2".
    // This implies Big X CROSS.
    // LB M1 feeds from [LB R1 M1] and [WB R2 M8 - inverted].
    // Let's us standardized CROSS: LB M(i) takes WB M(9-i).
    for (let i = 1; i <= 8; i++) {
        const invertedWbMatch = 9 - i;
        allMatches.push({
            id: `lb-r2-m${i}`, round: 2, bracket: 'lb',
            sourceMatchId1: `lb-r1-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r2-m${invertedWbMatch}`, sourceType2: 'loser',
            nextMatchId: `lb-r3-m${Math.ceil(i / 2)}`
        });
    }

    // --- LB R3 (4 Matches) ---
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `lb-r3-m${i}`, round: 3, bracket: 'lb',
            sourceMatchId1: `lb-r2-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `lb-r4-m${i}`
        });
    }

    // --- LB R4 (4 Matches) - WB R3 Losers (Shift) ---
    const lbR4Map = [3, 4, 1, 2];
    for (let i = 1; i <= 4; i++) {
        let wbSourceIndex = lbR4Map[i - 1];
        allMatches.push({
            id: `lb-r4-m${i}`, round: 4, bracket: 'lb',
            sourceMatchId1: `lb-r3-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r3-m${wbSourceIndex}`, sourceType2: 'loser',
            nextMatchId: `lb-r5-m${Math.ceil(i / 2)}`
        });
    }

    // --- LB R5 (2 Matches) ---
    for (let i = 1; i <= 2; i++) {
        allMatches.push({
            id: `lb-r5-m${i}`, round: 5, bracket: 'lb',
            sourceMatchId1: `lb-r4-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `lb-r4-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `lb-r6-m${i}`
        });
    }

    // --- LB R6 (2 Matches) - WB R4 Losers (DIRECT MAPPING 1:1) ---
    for (let i = 1; i <= 2; i++) {
        allMatches.push({
            id: `lb-r6-m${i}`, round: 6, bracket: 'lb',
            sourceMatchId1: `lb-r5-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r4-m${i}`, sourceType2: 'loser',
            nextMatchId: `lb-r7-m1`
        });
    }

    // --- LB R7 (1 Match) ---
    allMatches.push({
        id: `lb-r7-m1`, round: 7, bracket: 'lb',
        sourceMatchId1: `lb-r6-m1`, sourceType1: 'winner',
        sourceMatchId2: `lb-r6-m2`, sourceType2: 'winner',
        nextMatchId: `gf-m1`
    });

    // --- Grand Final ---
    allMatches.push({
        id: `gf-m1`, round: 1, bracket: 'gf',
        sourceMatchId1: `wb-r5-m1`, sourceType1: 'winner',
        sourceMatchId2: `lb-r7-m1`, sourceType2: 'winner'
    });

    // ==========================================
    // PLACEMENT BRACKETS ("RURKI")
    // ==========================================

    // --- 5-8th Place (WB R3 Losers) ---
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p5-r1-m${i}`, bracket: 'p5', round: 1, sourceMatchId1: `wb-r3-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `wb-r3-m${i * 2}`, sourceType2: 'loser' });
    }
    allMatches.push({ id: `p5-f`, bracket: 'p5', round: 2, sourceMatchId1: `p5-r1-m1`, sourceType1: 'winner', sourceMatchId2: `p5-r1-m2`, sourceType2: 'winner' }); // 5th
    allMatches.push({ id: `p7-f`, bracket: 'p5', round: 2, sourceMatchId1: `p5-r1-m1`, sourceType1: 'loser', sourceMatchId2: `p5-r1-m2`, sourceType2: 'loser' }); // 7th

    // --- 9-16th Place Group ---
    // P9-12 (Losers LB R4)
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p9-r1-m${i}`, bracket: 'p9', round: 1, sourceMatchId1: `lb-r4-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `lb-r4-m${i * 2}`, sourceType2: 'loser' });
    }
    allMatches.push({ id: `p9-f`, bracket: 'p9', round: 2, sourceMatchId1: `p9-r1-m1`, sourceType1: 'winner', sourceMatchId2: `p9-r1-m2`, sourceType2: 'winner' }); // 9th
    allMatches.push({ id: `p11-f`, bracket: 'p9', round: 2, sourceMatchId1: `p9-r1-m1`, sourceType1: 'loser', sourceMatchId2: `p9-r1-m2`, sourceType2: 'loser' }); // 11th

    // P13-16 (Losers LB R3)
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p13-r1-m${i}`, bracket: 'p13', round: 1, sourceMatchId1: `lb-r3-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `lb-r3-m${i * 2}`, sourceType2: 'loser' });
    }
    allMatches.push({ id: `p13-f`, bracket: 'p13', round: 2, sourceMatchId1: `p13-r1-m1`, sourceType1: 'winner', sourceMatchId2: `p13-r1-m2`, sourceType1: 'winner' }); // 13th
    allMatches.push({ id: `p15-f`, bracket: 'p13', round: 2, sourceMatchId1: `p13-r1-m1`, sourceType1: 'loser', sourceMatchId2: `p13-r1-m2`, sourceType2: 'loser' }); // 15th

    // --- 17-32nd Place Group ---
    // P17-24 (Losers LB R2)
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `p17-r1-m${i}`, bracket: 'p17', round: 1,
            sourceMatchId1: `lb-r2-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p17-r2-m${Math.ceil(i / 2)}`
        });
    }
    // Semis
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p17-r2-m${i}`, bracket: 'p17', round: 2, sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'winner' });
        allMatches.push({ id: `p21-r2-m${i}`, bracket: 'p21', round: 2, sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'loser' });
    }
    // Finals
    allMatches.push({ id: `p17-f`, bracket: 'p17', round: 3, sourceMatchId1: `p17-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p17-r2-m2`, sourceType1: 'winner' });
    allMatches.push({ id: `p19-f`, bracket: 'p19', round: 3, sourceMatchId1: `p17-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p17-r2-m2`, sourceType1: 'loser' });
    allMatches.push({ id: `p21-f`, bracket: 'p21', round: 3, sourceMatchId1: `p21-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p21-r2-m2`, sourceType1: 'winner' });
    allMatches.push({ id: `p23-f`, bracket: 'p23', round: 3, sourceMatchId1: `p21-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p21-r2-m2`, sourceType1: 'loser' });

    // P25-32 (Losers LB R1)
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `p25-r1-m${i}`, bracket: 'p25', round: 1,
            sourceMatchId1: `lb-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `lb-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p25-r2-m${Math.ceil(i / 2)}`
        });
    }
    // Semis
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p25-r2-m${i}`, bracket: 'p25', round: 2, sourceMatchId1: `p25-r1-m${i * 2 - 1}`, sourceType1: 'winner', sourceMatchId2: `p25-r1-m${i * 2}`, sourceType2: 'winner' });
        allMatches.push({ id: `p29-r2-m${i}`, bracket: 'p29', round: 2, sourceMatchId1: `p25-r1-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `p25-r1-m${i * 2}`, sourceType2: 'loser' });
    }
    // Finals
    allMatches.push({ id: `p25-f`, bracket: 'p25', round: 3, sourceMatchId1: `p25-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p25-r2-m2`, sourceType1: 'winner' });
    allMatches.push({ id: `p27-f`, bracket: 'p27', round: 3, sourceMatchId1: `p25-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p25-r2-m2`, sourceType1: 'loser' });
    allMatches.push({ id: `p29-f`, bracket: 'p29', round: 3, sourceMatchId1: `p29-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p29-r2-m2`, sourceType1: 'winner' });
    allMatches.push({ id: `p31-f`, bracket: 'p31', round: 3, sourceMatchId1: `p29-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p29-r2-m2`, sourceType1: 'loser' });

    return allMatches;
};

// ... rebuildBracketState SAME AS BEFORE but ensuring sorting ...
export const rebuildBracketState = (players, existingMatchesMap = {}) => {
    // 1. Prepare Seeds sorted by ELO
    const sortedPlayers = [...players].sort((a, b) => {
        const eloA = parseInt(a.elo || 0);
        const eloB = parseInt(b.elo || 0);
        if (eloA !== eloB) return eloB - eloA;
        return (a.full_name || "").localeCompare(b.full_name || "");
    });
    const seeds = [...sortedPlayers];
    while (seeds.length < 32) {
        seeds.push({ id: `bye-${seeds.length}`, full_name: "BYE", isBye: true });
    }

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
        if (seeds[pair[0] - 1]) m.player1Id = seeds[pair[0] - 1].id;
        if (seeds[pair[1] - 1]) m.player2Id = seeds[pair[1] - 1].id;
    });

    // 4. Processing logic (unchanged)
    const processingOrder = [
        ...allMatches.filter(m => m.bracket === 'wb').sort((a, b) => a.round - b.round),
        ...allMatches.filter(m => m.bracket === 'lb').sort((a, b) => a.round - b.round),
        ...allMatches.filter(m => m.bracket === 'gf'),
        ...allMatches.filter(m => m.bracket.startsWith('p')).sort((a, b) => {
            if (a.bracket !== b.bracket) return a.bracket.localeCompare(b.bracket);
            return a.round - b.round;
        })
    ];

    processingOrder.forEach(match => {
        // Resolve Players
        const resolveSource = (srcId, type) => {
            if (!srcId) return null;
            const src = matchMap.get(srcId);
            if (!src || !src.winnerId) return null;
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

        // Determine Scores/Winner
        const existing = existingMatchesMap[match.id];

        // Auto-win BYEs
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
            if (existing.winnerId) {
                match.winnerId = existing.winnerId;
            } else {
                const bestOf = (match.bracket === 'wb' || match.bracket === 'gf' || match.bracket.endsWith('f')) ? 5 : 3;
                const winThreshold = Math.ceil(bestOf / 2);
                if (match.score1 >= winThreshold) match.winnerId = match.player1Id;
                else if (match.score2 >= winThreshold) match.winnerId = match.player2Id;
            }
            match.status = match.winnerId ? 'finished' : 'live';
        } else {
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
