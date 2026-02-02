
// Helper: Static Seeding Order
const SEEDING_ORDER = [
    [1, 32], [17, 16], [9, 24], [25, 8],
    [5, 28], [21, 12], [13, 20], [29, 4],
    [3, 30], [19, 14], [11, 22], [27, 6],
    [7, 26], [23, 10], [15, 18], [31, 2]
];

// Helper: Define static structure of match sources
// Helper: Define static structure of match sources
// Helper: Define static structure of match sources
export const getBracketBlueprint = () => {
    const allMatches = [];

    // NUCLEAR WIPE: ONLY WB R1 ALLOWED
    // WB (5 Rounds) -> NOW ONLY R1

    // Hardcoded Player List (Mock Data for Reconstruction)
    const wbR1Config = [
        { id: 'wb-r1-m1', p1: 'Krůček Jiří', p2: 'Zaborowska Magda' },
        { id: 'wb-r1-m2', p1: 'van Delden Nick', p2: 'de Ruiter Sonja' },
        { id: 'wb-r1-m3', p1: 'Jacob Stefan', p2: 'Gober Kacper' },
        { id: 'wb-r1-m4', p1: 'Lachacz Marta', p2: 'Andulewicz Bartosz' },
        { id: 'wb-r1-m5', p1: 'Dylak Aleksandra', p2: 'Falada Labos' }, // Note: Names might be transposed in real data, adhering to list implies Order
        { id: 'wb-r1-m6', p1: 'Pomian Adam', p2: 'Danielewicz Mateusz' },
        { id: 'wb-r1-m7', p1: 'Leksowicz Maciej', p2: 'Kwiatkowska Daria' },
        { id: 'wb-r1-m8', p1: 'Bąkowski Patryk', p2: 'Słab Joz' },
        { id: 'wb-r1-m9', p1: 'Pretzschner Ralf', p2: 'Leśkiewicz Maciej' },
        { id: 'wb-r1-m10', p1: 'Gober Igor', p2: 'Kołodziej-Gościej Beata' }, // Using best guess for "Kołodzie.."
        { id: 'wb-r1-m11', p1: 'van Noort Michael', p2: 'Świdzicki Arkadiusz' },
        { id: 'wb-r1-m12', p1: 'Bibin Daniel', p2: 'Förster Felix' },
        { id: 'wb-r1-m13', p1: 'Gober Szymon', p2: 'Witkowski Szymon' },
        { id: 'wb-r1-m14', p1: 'Różycki Sylwester', p2: 'Andzel Adam' },
        { id: 'wb-r1-m15', p1: 'Klemm Rocco', p2: 'Groh Jeanette' },
        { id: 'wb-r1-m16', p1: 'Waszkiewicz Kamil', p2: 'Faust Elisabeth' }
    ];

    wbR1Config.forEach(cfg => {
        allMatches.push({
            id: cfg.id,
            round: 1,
            bracket: 'wb',
            // Pre-fill mock data for visual reconstruction
            player1: { id: cfg.p1, full_name: cfg.p1 },
            player2: { id: cfg.p2, full_name: cfg.p2 },
            player1Id: cfg.p1,
            player2Id: cfg.p2,
            score1: 3,
            score2: 0,
            winnerId: cfg.p1,
            // Sources
            sourceMatchId1: null, sourceType1: null, sourceMatchId2: null, sourceType2: null
        });
    });

    // NUCLEAR WIPE: ONLY WB R1 ALLOWED
    // ... WB R1 Config existing ...

    // --- FASE 2: ADD LOSERS ROUND 1 (17-32) - EXTREME MIRROR 1vs16 ---
    const lbCounts = [8]; // Activate Round 1 only
    lbCounts.forEach((count, rIdx) => {
        const round = rIdx + 1;
        for (let m = 1; m <= count; m++) {
            allMatches.push({ id: `lb-r${round}-m${m}`, round: round, bracket: 'lb', sourceMatchId1: null, sourceType1: null, sourceMatchId2: null, sourceType2: null });
        }
    });

    // --- FASE 3: WINNERS ROUND 2 (8 Matches) ---
    // Standard Progression: W(M1)+W(M2) -> M1, etc.
    for (let m = 1; m <= 8; m++) {
        allMatches.push({
            id: `wb-r2-m${m}`, round: 2, bracket: 'wb',
            score1: 3, score2: 0, // Auto-resolve P1 as winner
            sourceMatchId1: `wb-r1-m${m * 2 - 1}`, sourceType1: 'winner',
            sourceMatchId2: `wb-r1-m${m * 2}`, sourceType2: 'winner'
        });
    }

    // --- FASE 3: LOSERS ROUND 2 (Placement 9-16) ---
    for (let m = 1; m <= 8; m++) {
        allMatches.push({ id: `lb-r2-m${m}`, round: 2, bracket: 'lb', sourceMatchId1: null, sourceType1: null, sourceMatchId2: null, sourceType2: null });
    }

    // --- MAPPING LOGIC ---

    // LB R1 Maps Losers from WB R1
    // Logic: Match i (1-8) takes L(WB i) + L(WB 17-i)
    allMatches.filter(m => m.bracket === 'lb' && m.round === 1).forEach((m, i) => {
        const matchNum = i + 1;
        const lowSeedInverted = 17 - matchNum; // if i=0(M1) -> 16

        m.sourceMatchId1 = `wb-r1-m${matchNum}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `wb-r1-m${lowSeedInverted}`; m.sourceType2 = 'loser';
    });

    // LB R2 Logic: Full Vertical Inversion
    // LB Match 1 (Top) <- LB R1 M1 (Winner) + WB R2 M8 (Loser)
    // LB Match 8 (Bottom) <- LB R1 M8 (Winner) + WB R2 M1 (Loser)
    console.group("LB R2 Inversion Check");
    allMatches.filter(m => m.bracket === 'lb' && m.round === 2).forEach((m, i) => {
        const matchNum = i + 1; // 1-8

        // Source 1: Winner from LB R1 (Straight)
        m.sourceMatchId1 = `lb-r1-m${matchNum}`; m.sourceType1 = 'winner';

        // Source 2: Loser from WB R2 (INVERTED)
        // Formula: Target WB Match = 9 - LB Match Num
        // 9-1 = 8
        // 9-8 = 1
        const wbMatchNum = 9 - matchNum;
        m.sourceMatchId2 = `wb-r2-m${wbMatchNum}`; m.sourceType2 = 'loser';

        console.log(`Inversion confirmed: WB M${wbMatchNum} -> LB M${matchNum}`);
    });
    console.groupEnd();

    // --- COMMENTED OUT FUTURE ROUNDS FOR STABILITY ---
    /*

    // --- SOURCES (COMMENTED OUT) ---
    /*
    // WB R2-R5 (Winner Sources)
    for (let r = 2; r <= 5; r++) {
        const matches = allMatches.filter(m => m.bracket === 'wb' && m.round === r);
        matches.forEach((m, i) => {
            m.sourceMatchId1 = `wb-r${r - 1}-m${i * 2 + 1}`; m.sourceType1 = 'winner';
            m.sourceMatchId2 = `wb-r${r - 1}-m${i * 2 + 2}`; m.sourceType2 = 'winner';
        });
    }

    // LB Sources (Standard DE Logic)
    // LB R1 - EXTREME MIRROR PAIRING
    // Match 1: L(WB 1) + L(WB 16)
    // Match 2: L(WB 2) + L(WB 15)
    // ... Match 8: L(WB 8) + L(WB 9)
    allMatches.filter(m => m.bracket === 'lb' && m.round === 1).forEach((m, i) => {
        // LB R1 (17-32) - SEQUENTIAL BLOCKS
        // Match 1: L1 + L2
        // Match 2: L3 + L4
        m.sourceMatchId1 = `wb-r1-m${i * 2 + 1}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `wb-r1-m${i * 2 + 2}`; m.sourceType2 = 'loser';
    });

    // LB R2 (9-16) - TOTAL LOGIC RESET (Block X Swaps)
    // LB Block 1 (Indices 0,1) sources from WB Block 2 (Indices 2,3)
    // LB Block 2 (Indices 2,3) sources from WB Block 1 (Indices 0,1)
    // LB Block 3 (Indices 4,5) sources from WB Block 4 (Indices 6,7)
    // LB Block 4 (Indices 6,7) sources from WB Block 3 (Indices 4,5)

    // Mapping Table (LB Index -> WB Index)
    // 0 -> 2
    // 1 -> 3
    // 2 -> 0
    // 3 -> 1
    // 4 -> 6
    // 5 -> 7
    // 6 -> 4
    // 7 -> 5

    const lbToWbMap = [2, 3, 0, 1, 6, 7, 4, 5];

    console.groupCollapsed("LB R2 Placement Logic - Block Swap");
    allMatches.filter(m => m.bracket === 'lb' && m.round === 2).forEach((m, i) => {
        const wbSourceIndex = lbToWbMap[i]; // Get 0-7 index
        const wbMatchNum = wbSourceIndex + 1; // Convert to 1-8 ID

        // Source 1: Straight from LB R1 winner (Sequential)
        m.sourceMatchId1 = `lb-r1-m${i + 1}`;
        m.sourceType1 = 'winner';

        // Source 2: Cross-Over from WB R2 loser
        m.sourceMatchId2 = `wb-r2-m${wbMatchNum}`;
        m.sourceType2 = 'loser';

        console.log(`LB Match ${i + 1} [${m.id}] <== Winner LB R1 M${i + 1} + Loser WB R2 M${wbMatchNum}`);
    });
    });
    console.groupEnd();

    /*
    // --- COMMENTED OUT FUTURE ROUNDS FOR STABILITY ---
    // LB R3
    allMatches.filter(m => m.bracket === 'lb' && m.round === 3).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r2-m${i * 2 + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `lb-r2-m${i * 2 + 2}`; m.sourceType2 = 'winner';
    });
    // LB R4
    allMatches.filter(m => m.bracket === 'lb' && m.round === 4).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r3-m${i + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `wb-r3-m${i + 1}`; m.sourceType2 = 'loser';
    });
    // LB R5
    allMatches.filter(m => m.bracket === 'lb' && m.round === 5).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r4-m${i * 2 + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `lb-r4-m${i * 2 + 2}`; m.sourceType2 = 'winner';
    });
    // LB R6
    allMatches.filter(m => m.bracket === 'lb' && m.round === 6).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r5-m${i + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `wb-r4-m${i + 1}`; m.sourceType2 = 'loser';
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
    */

    // --- PLACEMENT SOURCES ---

    // 25-32 R1 (from LB R1 Losers)
    // LB R1 has 8 matches (1-8).
    // p25-r1-m1 takes losers of lb-r1-m1 and lb-r1-m2
    allMatches.filter(m => m.bracket === 'p25' && m.round === 1).forEach((m, i) => {
        // Cross-Pool: Top LB (1-4) -> Bottom P25 (3-4) | Bottom LB -> Top P25
        let lbBaseIndex;
        if (i < 2) {
            // Top P25 (Target 1,2) <- Bottom LB Losers (Matches 5,6 & 7,8)
            lbBaseIndex = 4 + (i * 2);
        } else {
            // Bottom P25 (Target 3,4) <- Top LB Losers (Matches 1,2 & 3,4)
            lbBaseIndex = (i - 2) * 2;
        }
        m.sourceMatchId1 = `lb-r1-m${lbBaseIndex + 1}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `lb-r1-m${lbBaseIndex + 2}`; m.sourceType2 = 'loser';
    });
    // 25-32 R2 (Winners -> 25-28)
    allMatches.filter(m => m.bracket === 'p25' && m.round === 2).forEach((m, i) => {
        m.sourceMatchId1 = `p25-r1-m${i * 2 + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `p25-r1-m${i * 2 + 2}`; m.sourceType2 = 'winner';
    });
    // 29-32 R2 (Losers -> 29-32)
    allMatches.filter(m => m.bracket === 'p29' && m.round === 2).forEach((m, i) => {
        m.sourceMatchId1 = `p25-r1-m${i * 2 + 1}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `p25-r1-m${i * 2 + 2}`; m.sourceType2 = 'loser';
    });
    // Finals
    // 25th: winners of p25-r2 (25-28 semis)
    const p25f = allMatches.find(m => m.id === 'p25-f');
    if (p25f) { p25f.sourceMatchId1 = 'p25-r2-m1'; p25f.sourceType1 = 'winner'; p25f.sourceMatchId2 = 'p25-r2-m2'; p25f.sourceType2 = 'winner'; }
    // 27th: losers of p25-r2
    const p27f = allMatches.find(m => m.id === 'p27-f');
    if (p27f) { p27f.sourceMatchId1 = 'p25-r2-m1'; p27f.sourceType1 = 'loser'; p27f.sourceMatchId2 = 'p25-r2-m2'; p27f.sourceType2 = 'loser'; }
    // 29th: winners of p29-r2
    const p29f = allMatches.find(m => m.id === 'p29-f');
    if (p29f) { p29f.sourceMatchId1 = 'p29-r2-m1'; p29f.sourceType1 = 'winner'; p29f.sourceMatchId2 = 'p29-r2-m2'; p29f.sourceType2 = 'winner'; }
    // 31st: losers of p29-r2
    const p31f = allMatches.find(m => m.id === 'p31-f');
    if (p31f) { p31f.sourceMatchId1 = 'p29-r2-m1'; p31f.sourceType1 = 'loser'; p31f.sourceMatchId2 = 'p29-r2-m2'; p31f.sourceType2 = 'loser'; }

    // 17-24 R1 (from LB R2 Losers)
    allMatches.filter(m => m.bracket === 'p17' && m.round === 1).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r2-m${i * 2 + 1}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `lb-r2-m${i * 2 + 2}`; m.sourceType2 = 'loser';
    });
    // 17-24 R2 (Winners -> 17-20)
    allMatches.filter(m => m.bracket === 'p17' && m.round === 2).forEach((m, i) => {
        m.sourceMatchId1 = `p17-r1-m${i * 2 + 1}`; m.sourceType1 = 'winner';
        m.sourceMatchId2 = `p17-r1-m${i * 2 + 2}`; m.sourceType2 = 'winner';
    });
    // 21-24 R2 (Losers -> 21-24)
    allMatches.filter(m => m.bracket === 'p21' && m.round === 2).forEach((m, i) => {
        m.sourceMatchId1 = `p17-r1-m${i * 2 + 1}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `p17-r1-m${i * 2 + 2}`; m.sourceType2 = 'loser';
    });
    // Finals (17, 19, 21, 23)
    const p17f = allMatches.find(m => m.id === 'p17-f');
    if (p17f) { p17f.sourceMatchId1 = 'p17-r2-m1'; p17f.sourceType1 = 'winner'; p17f.sourceMatchId2 = 'p17-r2-m2'; p17f.sourceType2 = 'winner'; }
    const p19f = allMatches.find(m => m.id === 'p19-f');
    if (p19f) { p19f.sourceMatchId1 = 'p17-r2-m1'; p19f.sourceType1 = 'loser'; p19f.sourceMatchId2 = 'p17-r2-m2'; p19f.sourceType2 = 'loser'; }
    const p21f = allMatches.find(m => m.id === 'p21-f');
    if (p21f) { p21f.sourceMatchId1 = 'p21-r2-m1'; p21f.sourceType1 = 'winner'; p21f.sourceMatchId2 = 'p21-r2-m2'; p21f.sourceType2 = 'winner'; }
    const p23f = allMatches.find(m => m.id === 'p23-f');
    if (p23f) { p23f.sourceMatchId1 = 'p21-r2-m1'; p23f.sourceType1 = 'loser'; p23f.sourceMatchId2 = 'p21-r2-m2'; p23f.sourceType2 = 'loser'; }

    // 13-16 R1 (from LB R3 Losers) (4 losers -> 2 matches)
    allMatches.filter(m => m.bracket === 'p13' && m.round === 1).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r3-m${i * 2 + 1}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `lb-r3-m${i * 2 + 2}`; m.sourceType2 = 'loser';
    });
    // 13-16 Finals
    const p13f = allMatches.find(m => m.id === 'p13-f');
    if (p13f) { p13f.sourceMatchId1 = 'p13-r1-m1'; p13f.sourceType1 = 'winner'; p13f.sourceMatchId2 = 'p13-r1-m2'; p13f.sourceType2 = 'winner'; }
    const p15f = allMatches.find(m => m.id === 'p15-f');
    if (p15f) { p15f.sourceMatchId1 = 'p13-r1-m1'; p15f.sourceType1 = 'loser'; p15f.sourceMatchId2 = 'p13-r1-m2'; p15f.sourceType2 = 'loser'; }

    // 9-12 R1 (from LB R4 Losers)
    allMatches.filter(m => m.bracket === 'p9' && m.round === 1).forEach((m, i) => {
        m.sourceMatchId1 = `lb-r4-m${i * 2 + 1}`; m.sourceType1 = 'loser';
        m.sourceMatchId2 = `lb-r4-m${i * 2 + 2}`; m.sourceType2 = 'loser';
    });
    // 9-12 Finals
    const p9f = allMatches.find(m => m.id === 'p9-f');
    if (p9f) { p9f.sourceMatchId1 = 'p9-r1-m1'; p9f.sourceType1 = 'winner'; p9f.sourceMatchId2 = 'p9-r1-m2'; p9f.sourceType2 = 'winner'; }
    const p11f = allMatches.find(m => m.id === 'p11-f');
    if (p11f) { p11f.sourceMatchId1 = 'p9-r1-m1'; p11f.sourceType1 = 'loser'; p11f.sourceMatchId2 = 'p9-r1-m2'; p11f.sourceType2 = 'loser'; }

    // 7-8 Match (from LB R5 Losers)
    const p7f = allMatches.find(m => m.id === 'p7-f');
    if (p7f) { p7f.sourceMatchId1 = 'lb-r5-m1'; p7f.sourceType1 = 'loser'; p7f.sourceMatchId2 = 'lb-r5-m2'; p7f.sourceType2 = 'loser'; }

    // 5-6 Match (from LB R6 Losers)
    const p5f = allMatches.find(m => m.id === 'p5-f');
    if (p5f) { p5f.sourceMatchId1 = 'lb-r6-m1'; p5f.sourceType1 = 'loser'; p5f.sourceMatchId2 = 'lb-r6-m2'; p5f.sourceType2 = 'loser'; }
    // */

    // --- POST-PROCESSING: LINK DESTINATIONS ---
    /*
    // Iterate to set nextMatchId (winner path) and consolationMatchId (loser path)
    // Create a quick lookup map
    const matchMap = new Map();
    allMatches.forEach(m => matchMap.set(m.id, m));

    allMatches.forEach(dest => {
        // Check Source 1
        if (dest.sourceMatchId1) {
            const src = matchMap.get(dest.sourceMatchId1);
            if (src) {
                if (dest.sourceType1 === 'winner') src.nextMatchId = dest.id;
                else if (dest.sourceType1 === 'loser') src.consolationMatchId = dest.id;
            }
        }
        // Check Source 2
        if (dest.sourceMatchId2) {
            const src = matchMap.get(dest.sourceMatchId2);
            if (src) {
                if (dest.sourceType2 === 'winner') src.nextMatchId = dest.id;
                else if (dest.sourceType2 === 'loser') src.consolationMatchId = dest.id;
            }
        }
    });
    */

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
