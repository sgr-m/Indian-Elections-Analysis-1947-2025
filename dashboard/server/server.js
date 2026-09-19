const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());

// Path to SQLite DB
const dbPath = path.resolve(__dirname, '../../data/processed/elections.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// Helper to run queries as Promises
const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// 1. Overview KPIs
app.get('/api/kpis', async (req, res) => {
    try {
        const total_elections = await runQuery("SELECT COUNT(DISTINCT election_year_clean) as count FROM Fact_Election_Results");
        const total_parties = await runQuery("SELECT COUNT(DISTINCT party_abbr_clean) as count FROM Fact_Election_Results");
        const total_const = await runQuery("SELECT COUNT(DISTINCT constitution) as count FROM Fact_Election_Results");
        const avg_turnout = await runQuery("SELECT AVG(turnout) as avg FROM Fact_LokSabha_Summary WHERE turnout IS NOT NULL");
        
        const turnout_trend = await runQuery("SELECT election_year_clean, AVG(turnout) as avg_turnout FROM Fact_LokSabha_Summary GROUP BY election_year_clean ORDER BY election_year_clean");
        const votes_trend = await runQuery("SELECT election_year_clean, SUM(votes_received) as total_votes FROM Fact_Election_Results GROUP BY election_year_clean ORDER BY election_year_clean");

        res.json({
            metrics: {
                total_elections: total_elections[0].count,
                total_parties: total_parties[0].count,
                total_const: total_const[0].count,
                avg_turnout: avg_turnout[0].avg
            },
            turnout_trend,
            votes_trend
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. States list
app.get('/api/states', async (req, res) => {
    try {
        const states = await runQuery("SELECT DISTINCT state_canonical FROM Dim_State ORDER BY state_canonical");
        res.json(states.map(s => s.state_canonical));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. State Details
app.get('/api/states/:state', async (req, res) => {
    try {
        const state = req.params.state;
        const metrics = await runQuery(`
            SELECT COUNT(DISTINCT constitution) as seats, MAX(vote_share_pct) as max_share 
            FROM Fact_Election_Results WHERE state_canonical = ?
        `, [state]);
        
        const dom_party = await runQuery(`
            SELECT party_abbr_clean, COUNT(*) as wins
            FROM Fact_Election_Results
            WHERE state_canonical = ? AND is_winner = 1
            GROUP BY party_abbr_clean
            ORDER BY wins DESC LIMIT 1
        `, [state]);

        const seats_dist = await runQuery(`
            SELECT election_year_clean, party_abbr_clean, COUNT(*) as seats_won
            FROM Fact_Election_Results
            WHERE state_canonical = ? AND is_winner = 1
            GROUP BY election_year_clean, party_abbr_clean
        `, [state]);

        res.json({
            metrics: metrics[0],
            dominant_party: dom_party[0],
            seats_distribution: seats_dist
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Parties list
app.get('/api/parties', async (req, res) => {
    try {
        const parties = await runQuery("SELECT party_abbr_clean FROM Dim_Party ORDER BY party_abbr_clean");
        res.json(parties.map(p => p.party_abbr_clean));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Party Details
app.get('/api/parties/:party', async (req, res) => {
    try {
        const party = req.params.party;
        const wins = await runQuery("SELECT SUM(is_winner) as total_wins, COUNT(*) as total_contested, AVG(vote_share_pct) as avg_share FROM Fact_Election_Results WHERE party_abbr_clean = ?", [party]);
        
        const trajectory = await runQuery(`
            SELECT election_year_clean, SUM(is_winner) as seats
            FROM Fact_Election_Results
            WHERE party_abbr_clean = ?
            GROUP BY election_year_clean
            ORDER BY election_year_clean
        `, [party]);

        const spread = await runQuery(`
            SELECT election_year_clean, vote_share_pct
            FROM Fact_Election_Results
            WHERE party_abbr_clean = ? AND vote_share_pct IS NOT NULL
        `, [party]);

        res.json({
            metrics: wins[0],
            trajectory: trajectory,
            spread: spread
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Coalition Insights
app.get('/api/coalitions', async (req, res) => {
    try {
        const alliances = await runQuery(`
            SELECT alliance, COUNT(*) as contested, SUM(is_winner) as wins
            FROM Fact_Election_Results
            WHERE alliance IS NOT NULL
            GROUP BY alliance
        `);
        
        const incumbency = await runQuery(`
            SELECT is_incumbent, SUM(is_winner) as wins, COUNT(*) as total
            FROM Fact_Election_Results
            WHERE is_incumbent IS NOT NULL
            GROUP BY is_incumbent
        `);

        const fragmentation = await runQuery(`
            SELECT election_year_clean, AVG(fragmentation_index) as avg_frag
            FROM Fact_Election_Results
            WHERE fragmentation_index IS NOT NULL
            GROUP BY election_year_clean
            ORDER BY election_year_clean
        `);

        res.json({
            alliances,
            incumbency,
            fragmentation
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
