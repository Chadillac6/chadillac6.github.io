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
    let currentGroupIndex = -1;
    const groupLetters = ['A', 'B', 'C', 'D'];
    let totalBirdies = 0;
    let birdieKing = '';
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Look for birdie stats first
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
        
        // Detect group headers (looking for "Rank" in column 1)
        if (row[1] && row[1].toLowerCase().includes('rank')) {
            currentGroupIndex++;
            continue;
        }
        
        // Extract player data - format is: [empty, rank, name, total, week1, week2, ...]
        // Only process if we're in a valid group section
        if (currentGroupIndex >= 0 && currentGroupIndex < 4) {
            const rank = parseInt(row[1]);
            const name = row[2];
            const total = parseFloat(row[3]);
            
            // Valid player row must have rank (1-4), name, and total
            if (!isNaN(rank) && rank >= 1 && rank <= 4 && name && !isNaN(total)) {
                // Get weekly scores (columns 4 onwards)
                const weeklyScores = [];
                for (let j = 4; j < Math.min(row.length, 16); j++) {
                    weeklyScores.push(row[j] || '-');
                }
                
                groups[groupLetters[currentGroupIndex]].push({
                    rank,
                    name,
                    total,
                    weeklyScores
                });
            }
        }
        
        // Stop processing after we've found all 4 groups and hit an empty row pattern
        if (currentGroupIndex >= 4 && row.every(cell => !cell || cell === '')) {
            break;
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
