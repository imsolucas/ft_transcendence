import { isAuthenticated, getCurrentUser, logout } from '../utils/auth-script';
import { navigate } from '../router';
import type { Screen } from '../router';

export function createNavbar(): HTMLElement {
	const navbar = document.createElement('nav');
	navbar.className = 'fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm';

	const container = document.createElement('div');
	container.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

	const navContent = document.createElement('div');
	navContent.className = 'flex items-center justify-between h-16';

	// Left side - Logo/Menu
	const leftSection = document.createElement('div');
	leftSection.className = 'flex items-center space-x-4';

	// Ping Pong Logo/Menu Button
	const logoButton = document.createElement('button');
	logoButton.className = 'flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 hover:bg-blue-50 cursor-pointer';

	const logoImg = document.createElement('img');
	logoImg.src = '/images/pong.png';
	logoImg.alt = 'Super Pong';
	logoImg.className = 'w-8 h-8';

	const logoText = document.createElement('span');
	logoText.className = 'text-xl font-bold text-gray-800 font-poppins hidden sm:block';
	logoText.textContent = 'Super Pong';

	logoButton.appendChild(logoImg);
	logoButton.appendChild(logoText);

	// Always allow menu toggle
	logoButton.addEventListener('click', () => {
		toggleMobileMenu();
	});
	logoButton.title = 'Menu';

	leftSection.appendChild(logoButton);

	// Right side - Social links and Auth
	const rightSection = document.createElement('div');
	rightSection.className = 'flex items-center space-x-3';

	// Social Media Buttons
	const socialContainer = document.createElement('div');
	socialContainer.className = 'flex items-center space-x-2';

	// Discord Button
	const discordButton = document.createElement('button');
	discordButton.className = 'p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 group';
	discordButton.innerHTML = `
    <svg class="w-5 h-5 text-gray-600 group-hover:text-[#5865F2] transition-colors" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.197.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  `;
	discordButton.title = 'Join our Discord';
	discordButton.addEventListener('click', () => {
		window.open('https://discord.gg/your-server', '_blank');
	});

	// Twitter Button
	const twitterButton = document.createElement('button');
	twitterButton.className = 'p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 group';
	twitterButton.innerHTML = `
    <svg class="w-5 h-5 text-gray-600 group-hover:text-[#1DA1F2] transition-colors" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
    </svg>
  `;
	twitterButton.title = 'Follow us on Twitter';
	twitterButton.addEventListener('click', () => {
		window.open('https://twitter.com/your-handle', '_blank');
	});

	socialContainer.appendChild(discordButton);
	socialContainer.appendChild(twitterButton);

	// Auth Section
	const authSection = document.createElement('div');
	authSection.className = 'flex items-center';

	if (isAuthenticated()) {
		const user = getCurrentUser();
		const profileContainer = document.createElement('div');
		profileContainer.className = 'relative';

		const profileButton = document.createElement('button');
		profileButton.className = 'flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200';

		// Use Google profile picture if available
		let profileImg: HTMLElement;
		if (user?.picture) {
			const img = document.createElement('img');
			img.src = user.picture;
			img.alt = user.username || 'Profile';
			img.className = 'w-8 h-8 rounded-full object-cover';
			profileImg = img;
		} else {
			const div = document.createElement('div');
			div.className = 'w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold';
			div.textContent = user?.username?.charAt(0).toUpperCase() || 'U';
			profileImg = div;
		}

		const profileText = document.createElement('span');
		profileText.className = 'text-sm font-medium text-gray-700 hidden sm:block';
		profileText.textContent = user?.username || 'User';

		const chevronIcon = document.createElement('svg');
		chevronIcon.setAttribute('class', 'w-4 h-4 text-gray-400');
		chevronIcon.setAttribute('fill', 'none');
		chevronIcon.setAttribute('stroke', 'currentColor');
		chevronIcon.setAttribute('viewBox', '0 0 24 24');
		chevronIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>';

		profileButton.appendChild(profileImg);
		profileButton.appendChild(profileText);
		profileButton.appendChild(chevronIcon);

		// Dropdown Menu
		const dropdown = document.createElement('div');
		dropdown.className = 'absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden';
		dropdown.innerHTML = `
      <a href="#" class="dropdown-item block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
        Profile
      </a>
      <a href="#" class="dropdown-item block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
        Game History
      </a>
      <a href="#" class="dropdown-item block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
        Settings
      </a>
      <hr class="my-1">
      <button class="logout-btn w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
        Logout
      </button>
    `;

		// Profile dropdown toggle
		profileButton.addEventListener('click', (e) => {
			e.stopPropagation();
			dropdown.classList.toggle('hidden');
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', () => {
			dropdown.classList.add('hidden');
		});

		// Logout handler
		const logoutBtn = dropdown.querySelector('.logout-btn');
		logoutBtn?.addEventListener('click', () => {
			logout();
			updateNavbar();
		});

		profileContainer.appendChild(profileButton);
		profileContainer.appendChild(dropdown);
		authSection.appendChild(profileContainer);

	} else {
		// Login/SignUp Button
		const loginButton = document.createElement('button');
		loginButton.className = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200';
		loginButton.textContent = 'Login / SignUp';
		loginButton.addEventListener('click', () => {
			navigate('auth' as Screen);
		});

		authSection.appendChild(loginButton);
	}

	rightSection.appendChild(socialContainer);
	rightSection.appendChild(authSection);

	// Assemble navbar
	navContent.appendChild(leftSection);
	navContent.appendChild(rightSection);
	container.appendChild(navContent);
	navbar.appendChild(container);

	return navbar;
}

// Mobile Menu (for when user is authenticated and clicks logo)
function toggleMobileMenu(): void {
	let existingMenu = document.querySelector('.mobile-menu');

	if (existingMenu) {
		existingMenu.remove();
		return;
	}

	const mobileMenu = document.createElement('div');
	mobileMenu.className = 'mobile-menu fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40';

	// Always visible
	let menuHTML = `
    <div class="px-4 py-3 space-y-2">
      <button id="landing-menu-btn" class="block w-full text-left px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
        🏠 Menu
      </button>
  `;

	// Conditionally add more if logged in
	if (isAuthenticated()) {
		menuHTML += `
      <a href="#" class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
        🎮 Play Game
      </a>
      <a href="#" class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
        🏆 Leaderboard
      </a>
      <a href="#" class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
        📊 Statistics
      </a>
      <a href="#" class="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
        ⚙️ Settings
      </a>
    `;
	}

	menuHTML += `</div>`;
	mobileMenu.innerHTML = menuHTML;

	// Add click handler for the Menu button
	const landingBtn = mobileMenu.querySelector('#landing-menu-btn');
	landingBtn?.addEventListener('click', () => {
		navigate('landing' as Screen);
		mobileMenu.remove();
	});

	// Close menu when clicking outside
	setTimeout(() => {
		document.addEventListener('click', (e) => {
			if (!mobileMenu.contains(e.target as Node)) {
				mobileMenu.remove();
			}
		}, { once: true });
	}, 0);

	document.body.appendChild(mobileMenu);
}


// Function to update navbar when auth state changes
export function updateNavbar(): void {
	const existingNavbar = document.querySelector('nav');
	if (existingNavbar) {
		existingNavbar.replaceWith(createNavbar());
	}
}

// Initialize navbar
export function initializeNavbar(): void {
	const navbar = createNavbar();
	document.body.insertBefore(navbar, document.body.firstChild);

	// Add padding to body to account for fixed navbar
	document.body.style.paddingTop = '64px';
}