
// Helper: Static Seeding Order - Professional Layout
// M1=A, M2=B, ..., M15=O, M16=P
// Order: Match A [1,32], Match B [16,17], ... Match O [15,18], Match P [2,31]
const SEEDING_ORDER = [
    [1, 32],   // Match A
    [16, 17],  // Match B
    [9, 24],   // Match C
    [8, 25],   // Match D
    [5, 28],   // Match E
    [12, 21],  // Match F
    [13, 20],  // Match G
    [4, 29],   // Match H
    [3, 30],   // Match I
    [14, 19],  // Match J
    [11, 22],  // Match K
    [6, 27],   // Match L
    [7, 26],   // Match M
    [10, 23],  // Match N
    [15, 18],  // Match O (Zaborowska vs Van Delden)
    [2, 31]    // Match P
];

export const getBracketBlueprint = () => {
    const allMatches = [];

    // --- WB R1 (16 Matches) ---
    for (let i = 1; i <= 16; i++) {
        allMatches.push({
            id: `wb-r1-m${i}`, round: 1, bracket: 'wb',
            nextMatchId: `wb-r2-m${Math.ceil(i / 2)}`
            // Loser destination determined in logic or map below? 
            // Better to define relations dynamically or here.
            // Requirement specifies complex mapping (Mirror).
            // We'll define sources here for LB to avoid "chicken and egg".
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


    // --- LB R1 (8 Matches) - WB R1 Losers (FULL MIRROR INVERSION) ---
    // User Requirement:
    // Mecz A (1) -> h1 (8)
    // Mecz P (16) -> a1 (1)
    // Mecz B (2) -> g1 (7)
    // Mecz O (15) -> b1 (2)
    // Formula derived:
    // LB Match i takes:
    // Source 1: WB Match (17 - i)  [Outer Mirror: 16, 15... 9]
    // Source 2: WB Match (9 - i)   [Inner Mirror: 8, 7... 1]
    for (let i = 1; i <= 8; i++) {
        allMatches.push({
            id: `lb-r1-m${i}`, round: 1, bracket: 'lb',
            sourceMatchId1: `wb-r1-m${17 - i}`, sourceType1: 'loser',
            sourceMatchId2: `wb-r1-m${9 - i}`, sourceType2: 'loser',
            nextMatchId: `lb-r2-m${i}`
        });
    }

    // --- LB R2 (8 Matches) - WB R2 Losers (BIG X) ---
    // Source 1: LB R1 Winner (Straight)
    // Source 2: WB R2 Loser (Inverted: WB M1 -> LB M8, WB M8 -> LB M1)
    for (let i = 1; i <= 8; i++) {
        const invertedWbMatch = 9 - i;
        allMatches.push({
            id: `lb-r2-m${i}`, round: 2, bracket: 'lb',
            sourceMatchId1: `lb-r1-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r2-m${invertedWbMatch}`, sourceType2: 'loser',
            nextMatchId: `lb-r3-m${Math.ceil(i / 2)}`
        });
    }

    // --- LB R3 (4 Matches) - Internal LB Adv ---
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `lb-r3-m${i}`, round: 3, bracket: 'lb',
            sourceMatchId1: `lb-r2-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `lb-r4-m${i}`
        });
    }

    // --- LB R4 (4 Matches) - WB R3 Losers (SHIFT 2 BLOCKS) ---
    // User: WB Q1 -> LB QL3, Q2 -> QL4, Q3 -> QL1, Q4 -> QL2
    // WB R3 M1 -> LB R4 M3
    // WB R3 M2 -> LB R4 M4
    // WB R3 M3 -> LB R4 M1
    // WB R3 M4 -> LB R4 M2
    const lbR4Map = [3, 4, 1, 2]; // Index 0 (WB M1) -> 3
    for (let i = 1; i <= 4; i++) {
        // Logic: specific source for each LB match
        // Reverse lookup: Which WB match feeds LB M(i)?
        // if i=1, source is WB M3. if i=2, source WB M4. if i=3, source WB M1. if i=4, source WB M2.
        // map index is wb match - 1. val is lb match.
        // We want to generate LB m1..4
        let wbSourceIndex;
        if (i === 1) wbSourceIndex = 3;
        if (i === 2) wbSourceIndex = 4;
        if (i === 3) wbSourceIndex = 1;
        if (i === 4) wbSourceIndex = 2;

        allMatches.push({
            id: `lb-r4-m${i}`, round: 4, bracket: 'lb',
            sourceMatchId1: `lb-r3-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r3-m${wbSourceIndex}`, sourceType2: 'loser',
            nextMatchId: `lb-r5-m${Math.ceil(i / 2)}`
        });
    }

    // --- LB R5 (2 Matches) - Internal ---
    for (let i = 1; i <= 2; i++) {
        allMatches.push({
            id: `lb-r5-m${i}`, round: 5, bracket: 'lb',
            sourceMatchId1: `lb-r4-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `lb-r4-m${i * 2}`, sourceType2: 'winner',
            nextMatchId: `lb-r6-m${i}`
        });
    }

    // --- LB R6 (2 Matches) - WB R4 Losers (MIRROR) ---
    // WB Semis -> LB Semis
    // WB M1 -> LB M2
    // WB M2 -> LB M1
    for (let i = 1; i <= 2; i++) {
        const wbSource = i === 1 ? 2 : 1;
        allMatches.push({
            id: `lb-r6-m${i}`, round: 6, bracket: 'lb',
            sourceMatchId1: `lb-r5-m${i}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r4-m${wbSource}`, sourceType2: 'loser',
            nextMatchId: `lb-r7-m1`
        });
    }

    // --- LB R7 (1 Match) - LB Final ---
    allMatches.push({
        id: `lb-r7-m1`, round: 7, bracket: 'lb',
        sourceMatchId1: `lb-r6-m1`, sourceType1: 'winner',
        sourceMatchId2: `lb-r6-m2`, sourceType2: 'winner',
        nextMatchId: `gf-m1` // Winner goes to GF? 
        // Note: Standard DE has "Finals" where Winner WB vs Winner LB.
        // If Winner WB loses, there is a reset.
        // We will assume standard single-set Final for now or simple Grand Final.
    });

    // --- Grand Final ---
    // Winner WB R5 vs Winner LB R7
    allMatches.push({
        id: `gf-m1`, round: 1, bracket: 'gf',
        sourceMatchId1: `wb-r5-m1`, sourceType1: 'winner',
        sourceMatchId2: `lb-r7-m1`, sourceType2: 'winner'
    });

    // --- PLACEMENT MATCHES (Consolation) ---

    // P25-32: Losers of LB R1 (8 players)
    // 4 matches. Then 2, Then 1. 29th, 31st etc.
    // For brevity, I'll map R1 (4 matches) taking LB losers.
    // LB R1 M1/M2 -> P25 M1 etc.
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `p25-r1-m${i}`, round: 1, bracket: 'p25',
            sourceMatchId1: `lb-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `lb-r1-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p25-r2-m${Math.ceil(i / 2)}`
        });
    }
    // P25 R2 (2 matches)
    for (let i = 1; i <= 2; i++) {
        allMatches.push({
            id: `p25-r2-m${i}`, round: 2, bracket: 'p25',
            sourceMatchId1: `p25-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `p25-r1-m${i * 2}`, sourceType2: 'winner'
        });
        // Losers of P25 R1 -> P29 Bracket (optional, usually "shared 29th" or played out)
        // User requested: "play for 3, 5, 7... 31". So FULL placement.
        allMatches.push({
            id: `p29-r2-m${i}`, round: 2, bracket: 'p29',
            sourceMatchId1: `p25-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `p25-r1-m${i * 2}`, sourceType2: 'loser'
        });
    }
    // Finals for 25, 27, 29, 31
    allMatches.push({ id: `p25-f`, bracket: 'p25', round: 3, sourceMatchId1: `p25-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p25-r2-m2`, sourceType2: 'winner' }); // 25th
    allMatches.push({ id: `p27-f`, bracket: 'p27', round: 3, sourceMatchId1: `p25-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p25-r2-m2`, sourceType2: 'loser' }); // 27th
    allMatches.push({ id: `p29-f`, bracket: 'p29', round: 3, sourceMatchId1: `p29-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p29-r2-m2`, sourceType2: 'winner' }); // 29th
    allMatches.push({ id: `p31-f`, bracket: 'p31', round: 3, sourceMatchId1: `p29-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p29-r2-m2`, sourceType2: 'loser' }); // 31st

    /* Repeat similar logic for P17 (Losers LB R2), P13 (Losers LB R3), etc.
       For brevity in this Turn 1 logic, I will implement P17 and P13, P9, P7, P5, P3.
    */

    // P17 (Losers LB R2 - 8 matches) -> 4 matches
    for (let i = 1; i <= 4; i++) {
        allMatches.push({
            id: `p17-r1-m${i}`, round: 1, bracket: 'p17',
            sourceMatchId1: `lb-r2-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `lb-r2-m${i * 2}`, sourceType2: 'loser',
            nextMatchId: `p17-r2-m${Math.ceil(i / 2)}`
        });
    }
    // P17 R2 etc matches logic mirrors P25... (OMITTED FOR BREVITY - Assume users usually only care about top placements, but instructions say "until 31". I did P25-32. I will do P17-24 basic.)
    // Impl P17 R2
    for (let i = 1; i <= 2; i++) {
        allMatches.push({
            id: `p17-r2-m${i}`, round: 2, bracket: 'p17',
            sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'winner'
        });
        allMatches.push({
            id: `p21-r2-m${i}`, round: 2, bracket: 'p21',
            sourceMatchId1: `p17-r1-m${i * 2 - 1}`, sourceType1: 'loser',
            sourceMatchId2: `p17-r1-m${i * 2}`, sourceType2: 'loser'
        });
    }
    // Finals 17, 19, 21, 23
    allMatches.push({ id: `p17-f`, bracket: 'p17', round: 3, sourceMatchId1: `p17-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p17-r2-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p19-f`, bracket: 'p19', round: 3, sourceMatchId1: `p17-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p17-r2-m2`, sourceType2: 'loser' });
    allMatches.push({ id: `p21-f`, bracket: 'p21', round: 3, sourceMatchId1: `p21-r2-m1`, sourceType1: 'winner', sourceMatchId2: `p21-r2-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p23-f`, bracket: 'p23', round: 3, sourceMatchId1: `p21-r2-m1`, sourceType1: 'loser', sourceMatchId2: `p21-r2-m2`, sourceType2: 'loser' });

    // P13 (Losers LB R3 - 4 matches) -> 2 matches
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p13-r1-m${i}`, bracket: 'p13', round: 1, sourceMatchId1: `lb-r3-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `lb-r3-m${i * 2}`, sourceType2: 'loser' });
    }
    // Finals 13, 15
    allMatches.push({ id: `p13-f`, bracket: 'p13', round: 2, sourceMatchId1: `p13-r1-m1`, sourceType1: 'winner', sourceMatchId2: `p13-r1-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p15-f`, bracket: 'p15', round: 2, sourceMatchId1: `p13-r1-m1`, sourceType1: 'loser', sourceMatchId2: `p13-r1-m2`, sourceType2: 'loser' });

    // P9 (Losers LB R4 - 4 matches) -> 2 matches
    for (let i = 1; i <= 2; i++) {
        allMatches.push({ id: `p9-r1-m${i}`, bracket: 'p9', round: 1, sourceMatchId1: `lb-r4-m${i * 2 - 1}`, sourceType1: 'loser', sourceMatchId2: `lb-r4-m${i * 2}`, sourceType2: 'loser' });
    }
    // Finals 9, 11
    allMatches.push({ id: `p9-f`, bracket: 'p9', round: 2, sourceMatchId1: `p9-r1-m1`, sourceType1: 'winner', sourceMatchId2: `p9-r1-m2`, sourceType2: 'winner' });
    allMatches.push({ id: `p11-f`, bracket: 'p11', round: 2, sourceMatchId1: `p9-r1-m1`, sourceType1: 'loser', sourceMatchId2: `p9-r1-m2`, sourceType2: 'loser' });

    // P7 (Losers LB R5 - 2 matches) -> 1 match
    allMatches.push({ id: `p7-f`, bracket: 'p7', round: 1, sourceMatchId1: `lb-r5-m1`, sourceType1: 'loser', sourceMatchId2: `lb-r5-m2`, sourceType2: 'loser' });

    // P5 (Losers LB R6 - 2 matches) -> 1 match
    allMatches.push({ id: `p5-f`, bracket: 'p5', round: 1, sourceMatchId1: `lb-r6-m1`, sourceType1: 'loser', sourceMatchId2: `lb-r6-m2`, sourceType2: 'loser' });

    // P3 (Loser LB R7 vs Loser WB Final - Wait, User said "consolation matches for all", 3rd place is typical)
    // LB R7 is LB Final. Loser of LB Final is 3rd? No.
    // Grand Final = WB Final Winner vs LB Final Winner.
    // So Loser of GF is 2nd. Winner 1st.
    // 3rd place? The loser of LB Final is 3rd.
    // 4th place? The loser of WB Final (who plays in LB Final) if they lose in LB Final?
    // Wait. WB Final -> Winner to GF. Loser to LB Final.
    // LB Final -> Winner to GF. Loser is 3rd.
    // So LB Final IS the match that determines 3rd place loser.
    // BUT we need a match for 4th?
    // In standard DE:
    // WB Final Loser drops to LB Final.
    // LB Final: Loser of WB Final vs Winner of LB Semis.
    // Winner goes to GF. Loser takes 3rd.
    // So 3rd place is determined by LB Final.

    // BUT: Does the user want a separate match for 3rd/4th? Most likely LB Final covers it.
    // I won't add a specific P3 match unless "Consolation" implies non-standard. "play for 3..." usually implies that place is decided.
    // The Loser of LB Final is 3rd.

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
