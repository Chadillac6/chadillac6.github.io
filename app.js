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

// Extract leaderboard data from parsed CSV
function extractLeaderboardData(rows) {
    const groups = { A: [], B: [], C: [], D: [] };
    let currentGroup = null;
    let totalBirdies = 0;
    let birdieKing = '';
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Detect group headers (looking for "Rank" in first columns)
        if (row[2] === 'Rank' || row[1] === 'Rank') {
            // Next rows will be members of a group
            const groupLetter = String.fromCharCode(65 + Object.keys(groups).filter(k => groups[k].length > 0).length);
            currentGroup = groupLetter;
            continue;
        }
        
        // Extract player data (rank, name, total points, weekly scores)
        if (currentGroup && row[2] && !isNaN(row[1]) && row[3]) {
            const rank = parseInt(row[1]);
            const name = row[2];
            const total = parseFloat(row[3]);
            
            // Get weekly scores (columns 4 onwards)
            const weeklyScores = [];
            for (let j = 4; j < Math.min(row.length, 16); j++) {
                weeklyScores.push(row[j] || '-');
            }
            
            if (name && !isNaN(total)) {
                groups[currentGroup].push({
                    rank,
                    name,
                    total,
                    weeklyScores
                });
            }
        }
        
        // Look for weekly winners
        if (row[2] === 'Weekly Low:' || row[3] === 'Weekly Low:') {
            // This row contains weekly winners
        }
        
        // Look for birdie stats
        if (row.join(',').includes('Total Birdies:')) {
            const birdieIndex = row.indexOf('Total Birdies:');
            if (birdieIndex >= 0 && row[birdieIndex + 1]) {
                totalBirdies = parseInt(row[birdieIndex + 1]) || 0;
            }
        }
        
        if (row.join(',').includes('Birdie King:')) {
            const kingIndex = row.indexOf('Birdie King:');
            if (kingIndex >= 0 && row[kingIndex + 1]) {
                birdieKing = row[kingIndex + 1];
            }
        }
    }
    
    return { groups, totalBirdies, birdieKing };
}

// Render leaderboard
function renderLeaderboard(data) {
    const container = document.getElementById('leaderboard-container');
    container.innerHTML = '';
    
    // Update stats banner
    document.getElementById('total-birdies').textContent = data.totalBirdies || '-';
    document.getElementById('birdie-king').textContent = data.birdieKing || '-';
    
    // Render each group
    Object.keys(data.groups).forEach(groupKey => {
        const groupData = data.groups[groupKey];
        if (groupData.length === 0) return;
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-leaderboard';
        
        const groupClass = `group-${groupKey.toLowerCase()}`;
        
        groupDiv.innerHTML = `
            <div class="group-leaderboard-header ${groupClass}">
                ${GROUPS[groupKey].name}
            </div>
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th class="rank">Rank</th>
                        <th>Player</th>
                        <th>Total Points</th>
                    </tr>
                </thead>
                <tbody>
                    ${groupData.map(player => `
                        <tr>
                            <td class="rank">
                                <span class="rank-badge ${getRankClass(player.rank)}">${player.rank}</span>
                            </td>
                            <td>
                                <span class="player-name">${player.name}</span>
                            </td>
                            <td>
                                <span class="total-points">${player.total}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.appendChild(groupDiv);
    });
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
