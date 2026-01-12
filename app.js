// Google Sheets CSV URL
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSdlDXqcBxu_SOx23N658q0REWTXmJBqx9lJAqYWpi5O-xznu2Iolx2Iix_RTrBFYexfpqOawJNcKIW/pub?output=csv';

// Group configurations
const GROUPS = {
    'A': { name: 'Group A', members: ['Chad', 'Carp', 'Chuck', 'Glen'] },
    'B': { name: 'Group B', members: ['Jake', 'Sean', 'Jimmy', 'Faro'] },
    'C': { name: 'Group C', members: ['Joey', 'Kevin', 'Baker', 'Andulics'] },
    'D': { name: 'Group D', members: ['Tony', 'Jared', 'Ian', 'Josh'] }
};

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    return lines.map(line => {
        // Handle quoted fields with commas
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    });
}

// Extract leaderboard data from parsed CSV (rows 4-23)
function extractLeaderboardData(rows) {
    const players = [];
    const groupLetters = ['A', 'B', 'C', 'D'];
    let totalBirdies = 0;
    let birdieKing = '';
    let playerCount = 0;
    
    // Get week headers from row 1 (columns 4 onwards)
    const weekHeaders = [];
    if (rows.length > 1) {
        for (let j = 4; j < 16; j++) {
            if (rows[1][j]) {
                weekHeaders.push(rows[1][j]);
            }
        }
    }
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Look for birdie stats
        if (row.join(',').includes('Total Birdies:')) {
            for (let j = 0; j < row.length; j++) {
                if (row[j] === 'Total Birdies:' && row[j + 2]) {
                    totalBirdies = parseInt(row[j + 2]) || 0;
                }
                if (row[j] === 'Birdie King:' && row[j + 3]) {
                    birdieKing = row[j + 3];
                }
            }
        }
        
        // Extract player data - look for rows with rank (1-4) in column 1, name in column 2, total in column 3
        const rank = parseInt(row[1]);
        const name = row[2];
        const total = parseFloat(row[3]);
        
        // Valid player row: has numeric rank 1-4, has a name, has a total score
        if (!isNaN(rank) && rank >= 1 && rank <= 4 && name && name.trim() !== '' && !isNaN(total)) {
            // Determine which group based on player count (first 4 = A, next 4 = B, etc.)
            const groupIndex = Math.floor(playerCount / 4);
            
            // Only process first 16 players (4 groups x 4 players)
            if (groupIndex < 4) {
                // Get weekly scores (columns 4 onwards)
                const weeklyScores = [];
                for (let j = 4; j < 16; j++) {
                    const score = row[j] || '0';
                    weeklyScores.push(score);
                }
                
                players.push({
                    name,
                    group: groupLetters[groupIndex],
                    total,
                    weeklyScores
                });
                
                playerCount++;
            }
        }
        
        // Stop after collecting 16 players
        if (playerCount >= 16) {
            break;
        }
    }
    
    // Sort players by total points (descending)
    players.sort((a, b) => b.total - a.total);
    
    // Assign overall ranks
    players.forEach((player, index) => {
        player.rank = index + 1;
    });
    
    return { players, weekHeaders, totalBirdies, birdieKing };
}

// Render Masters-style leaderboard
function renderLeaderboard(data) {
    const container = document.getElementById('leaderboard-container');
    container.innerHTML = '';
    
    // Update stats banner
    document.getElementById('total-birdies').textContent = data.totalBirdies || '-';
    document.getElementById('birdie-king').textContent = data.birdieKing || '-';
    
    // Create single leaderboard table
    const leaderboardDiv = document.createElement('div');
    leaderboardDiv.className = 'masters-leaderboard';
    
    // Build week header columns
    const weekHeaderCells = data.weekHeaders.slice(0, 11).map(header => 
        `<th class="week-col">${header}</th>`
    ).join('');
    
    // Build player rows
    const playerRows = data.players.map(player => {
        const groupClass = `group-${player.group.toLowerCase()}`;
        const scoreClass = player.total > 0 ? 'score-red' : '';
        
        // Build weekly score cells
        const weekCells = player.weeklyScores.slice(0, 11).map(score => {
            const displayScore = score === '0' || score === '' ? '-' : score;
            const cellClass = parseFloat(score) > 0 ? 'score-positive' : '';
            return `<td class="week-col ${cellClass}">${displayScore}</td>`;
        }).join('');
        
        return `
            <tr class="player-row">
                <td class="rank-col">
                    <span class="rank-number ${getRankClass(player.rank)}">${player.rank}</span>
                </td>
                <td class="player-col">
                    <span class="player-name">${player.name}</span>
                    <span class="player-group ${groupClass}">Group ${player.group}</span>
                </td>
                ${weekCells}
                <td class="total-col ${scoreClass}">
                    <strong>${player.total}</strong>
                </td>
            </tr>
        `;
    }).join('');
    
    leaderboardDiv.innerHTML = `
        <table class="masters-table">
            <thead>
                <tr>
                    <th class="rank-col">Pos</th>
                    <th class="player-col">Player</th>
                    ${weekHeaderCells}
                    <th class="total-col">Total</th>
                </tr>
            </thead>
            <tbody>
                ${playerRows}
            </tbody>
        </table>
    `;
    
    container.appendChild(leaderboardDiv);
}

// Get rank class for styling
function getRankClass(rank) {
    if (rank === 1) return 'first';
    if (rank === 2) return 'second';
    if (rank === 3) return 'third';
    return '';
}

// Fetch and display leaderboard data
async function loadLeaderboard() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    
    try {
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';
        
        const response = await fetch(SHEET_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch data from Google Sheets');
        }
        
        const csvText = await response.text();
        const rows = parseCSV(csvText);
        const data = extractLeaderboardData(rows);
        
        renderLeaderboard(data);
        loadingEl.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = 'Error loading leaderboard data. Please try refreshing the page.';
    }
}

// Initialize on page load
if (document.getElementById('leaderboard-container')) {
    loadLeaderboard();
}
