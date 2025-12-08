import type { PlayerInfo } from "./loadingGame";

function createStat(label: string, value: string | number, isActive: boolean = true): HTMLElement {
    const statDiv = document.createElement('div');
    statDiv.className = 'text-center';

    const labelDiv = document.createElement('div');
    labelDiv.className = isActive ? 'text-[#F34C94]' : 'text-gray-500';
    labelDiv.textContent = label;

    const valueDiv = document.createElement('div');
    valueDiv.className = isActive ? 'text-white' : 'text-gray-400';
    valueDiv.textContent = String(value);

    statDiv.appendChild(labelDiv);
    statDiv.appendChild(valueDiv);
    return statDiv;
}

function createStatsGrid(player: PlayerInfo | null, isActive: boolean = true): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-2 text-xs';

    grid.appendChild(createStat('WINS', player?.wins || (isActive ? 0 : '-'), isActive));
    grid.appendChild(createStat('WIN RATE', player?.winRate || (isActive ? '0%' : '-'), isActive));

    return grid;
}

function createAvatar(player: PlayerInfo | null, isOpponent: boolean = false): HTMLElement {
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'relative mb-4';

    if (player) {
        const img = document.createElement('img');
        img.src = player.picture || '/images/pong.png';
        img.alt = isOpponent ? 'Opponent Avatar' : 'Your Avatar';
        img.className = 'w-24 h-24 rounded-full border-4 border-[#F34C94] shadow-[0_0_20px_rgba(243,76,148,0.6)] object-cover mx-auto';
        avatarContainer.appendChild(img);

        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center';
        const statusDot = document.createElement('div');
        statusDot.className = 'w-2 h-2 bg-white rounded-full animate-pulse';
        statusIndicator.appendChild(statusDot);
        avatarContainer.appendChild(statusIndicator);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'w-24 h-24 rounded-full border-4 border-gray-600 bg-gray-800 mx-auto flex items-center justify-center';
        const spinner = document.createElement('div');
        spinner.className = 'w-8 h-8 border-2 border-gray-600 rounded-full animate-spin';
        placeholder.appendChild(spinner);
        avatarContainer.appendChild(placeholder);
    }

    return avatarContainer;
}

export function createPlayerCard (
    player: PlayerInfo | null,
    isOpponent: boolean = false,
    isActive: boolean = true,
    showGlow: boolean = false
): HTMLElement {
    const card = document.createElement('div');
    card.className = 'w-full lg:w-1/3';

    const cardInner = document.createElement('div');
    const baseClass = 'player-card bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border-2';
    const borderClass = isActive ? 'border-[#F34C94]/30 shadow-[0_0_30px_rgba(243,76,148,0.2)]' : 'border-gray-600/30 shadow-[0_0_20px_rgba(100,100,100,0.1)]';
    const glowClass = showGlow ? ' pulse-glow' : '';
    cardInner.className = `${baseClass} ${borderClass}${glowClass}`;

    const textCenter = document.createElement('div');
    textCenter.className = 'text-center';

    // Avatar
    const avatarContainer = createAvatar(player, isOpponent);

    // Title
    const title = document.createElement('h3');
    title.className = `font-['Press_Start_2P'] text-lg ${isActive ? 'text-[#F34C94]' : 'text-gray-500'} mb-2`;
    title.textContent = isOpponent ? 'OPPONENT' : 'YOU';

    // Username
    const username = document.createElement('p');
    username.className = `font-['Orbitron'] ${isActive ? 'text-white' : 'text-gray-400'} text-xl mb-2`;
    username.textContent = player?.username || (isOpponent ? 'Searching...' : 'Player');

    // Stats grid
    const statsGrid = createStatsGrid(player, isActive);

    textCenter.appendChild(avatarContainer);
    textCenter.appendChild(title);
    textCenter.appendChild(username);
    textCenter.appendChild(statsGrid);

    cardInner.appendChild(textCenter);
    card.appendChild(cardInner);

    return card;
}