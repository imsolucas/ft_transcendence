import { isAuthenticated, getCurrentUser, logout } from '../utils/auth-script';
import { navigate } from '../router';
import type { Screen } from '../router';

export function createNavbar(): HTMLElement {
	const navbar = document.createElement('nav');
	// Remove bg-transparent and backdrop-blur-md, add fully transparent background
	navbar.className = `
    fixed top-0 left-0 right-0 z-50
    border-b border-white/10
    shadow-none
    transition-colors
    `.replace(/\s+/g, ' ');
	
	const container = document.createElement('div');
	container.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

	const navContent = document.createElement('div');
	navContent.className = 'flex items-center justify-between h-16';

	// Left side - Logo/Menu
	const leftSection = document.createElement('div');
	leftSection.className = 'flex items-center space-x-4';

	// Ping Pong Logo/Menu Button - updated hover effect for transparency
	const logoButton = document.createElement('button');
	logoButton.className = 'flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 hover:bg-white/10 cursor-pointer';

	const logoImg = document.createElement('img');
	logoImg.src = '/images/pong.png';
	logoImg.alt = 'Super Pong';
	logoImg.className = 'w-8 h-8';

	const logoText = document.createElement('span');
	// Changed text color to white for better contrast on colored backgrounds
	logoText.className = 'text-xl font-bold font-poppins hidden sm:block bg-gradient-to-l from-[#F49752] to-[#F031A5] text-transparent bg-clip-text';
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

	// Social Media Buttons - updated hover colors for transparency
	const socialContainer = document.createElement('div');
	socialContainer.className = 'flex items-center space-x-2';

	// Discord Button
	// Discord Button
	const discordButton = document.createElement('button');
	discordButton.className = 'p-2 rounded-lg hover:bg-white/10 transition-colors duration-200 group bg-gradient-to-l from-[#F49752] to-[#F031A5]';
	discordButton.innerHTML = `
	<svg class="w-5 h-5 text-white/80 group-hover:text-[#5865F2] transition-colors" fill="currentColor" viewBox="0 0 24 24">
	  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.197.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
	</svg>
  `;
	discordButton.title = 'Join our Discord';
	discordButton.addEventListener('click', () => {
		window.open('https://youtube.com', '_blank');
	});

	// Twitter Button
	const twitterButton = document.createElement('button');
	twitterButton.className = 'p-2 rounded-lg hover:bg-white/10 transition-colors duration-200 group bg-gradient-to-l from-[#F49752] to-[#F031A5]';
	twitterButton.innerHTML = `
	<svg class="w-5 h-5 text-white/80 group-hover:text-[#1DA1F2] transition-colors" fill="currentColor" viewBox="0 0 24 24">
	  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
	</svg>
  `;
	twitterButton.title = 'Follow us on Twitter';
	twitterButton.addEventListener('click', () => {
		window.open('https://youtube.com', '_blank');
	});

	// socialContainer.appendChild(discordButton);
	// socialContainer.appendChild(twitterButton);

	// Auth Section
	const authSection = document.createElement('div');
	authSection.className = 'flex items-center';

	if (isAuthenticated()) {
		const user = getCurrentUser();
		const profileContainer = document.createElement('div');
		profileContainer.className = 'relative';

		const profileButton = document.createElement('button');
		profileButton.className = 'flex items-center space-x-2 p-1 rounded-full hover:bg-white/10 transition-colors duration-200';

		// Use Google profile picture if available
		let profileImg: HTMLElement;
		console.log(user?.picture);
		if (user?.picture) {
			const img = document.createElement('img');
			img.src = user.picture;
			img.alt = user.username?.charAt(0).toUpperCase() || 'P';
			img.className = 'w-8 h-8 rounded-full object-cover';
			img.onerror = () => {
				const div = document.createElement('div');
				div.className = 'w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold';
				div.textContent = user?.username?.charAt(0).toUpperCase() || 'U';
				img.replaceWith(div);
			};
			profileImg = img;
		} else {
			const div = document.createElement('div');
			div.className = 'w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold';
			div.textContent = user?.username?.charAt(0).toUpperCase() || 'U';
			profileImg = div;
		}

		const profileText = document.createElement('span');
		// Changed to white text for better visibility
		profileText.className = 'text-sm font-medium bg-gradient-to-l from-[#F49752] to-[#F031A5] text-transparent bg-clip-text hidden sm:block';
		profileText.textContent = user?.username || 'User';

		const chevronIcon = document.createElement('svg');
		chevronIcon.setAttribute('class', 'w-4 h-4 text-white/60 transition-transform duration-200');
		chevronIcon.setAttribute('fill', 'none');
		chevronIcon.setAttribute('stroke', 'currentColor');
		chevronIcon.setAttribute('viewBox', '0 0 24 24');
		chevronIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>';

		profileButton.appendChild(profileImg);
		profileButton.appendChild(profileText);
		profileButton.appendChild(chevronIcon);

		// Enhanced Dropdown Menu with sliding animations
		const dropdown = document.createElement('div');
		dropdown.className = 'dropdown-menu absolute right-0 mt-2 bg-transparent w-48 backdrop-blur-md rounded-lg shadow-lg border border-white/20 py-1 overflow-hidden';
		
		// Set initial state for animation
		dropdown.style.maxHeight = '0';
		dropdown.style.opacity = '0';
		dropdown.style.transform = 'translateY(-10px)';
		dropdown.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
		
		dropdown.innerHTML = `
	  <a href="#" data-link="profile" class="dropdown-item block px-4 py-2 text-sm text-[#00FF85] hover:bg-gray-100/80 transition-colors">
		Profile
	  </a>
	  <a href="#" data-link="profile" data-tab="friends" class="dropdown-item block px-4 py-2 text-sm text-[#00FF85] hover:bg-gray-100/80 transition-colors">
		Friends
	  </a>
	  <a href="#" data-link="profile" data-tab="match-history" class="dropdown-item block px-4 py-2 text-sm text-[#00FF85] hover:bg-gray-100/80 transition-colors">
		Game History
	  </a>
	  <hr class="my-1">
	  <button class="logout-btn w-full text-left px-4 py-2 text-sm text-[#2BD2FF] hover:bg-red-50/80 transition-colors">
		Logout
	  </button>
	`;

		let isDropdownOpen = false;

		// Enhanced profile dropdown toggle with animations
		profileButton.addEventListener('click', (e) => {
			e.stopPropagation();
			
			if (!isDropdownOpen) {
				// Open dropdown - slide down animation
				dropdown.style.display = 'block';
				
				// Force a reflow to ensure the display change takes effect
				dropdown.offsetHeight;
				
				// Animate to open state
				dropdown.style.maxHeight = '200px'; // Adjust based on content
				dropdown.style.opacity = '1';
				dropdown.style.transform = 'translateY(0)';
				chevronIcon.style.transform = 'rotate(180deg)';
				
				isDropdownOpen = true;
			} else {
				// Close dropdown - slide up animation
				dropdown.style.maxHeight = '0';
				dropdown.style.opacity = '0';
				dropdown.style.transform = 'translateY(-10px)';
				chevronIcon.style.transform = 'rotate(0deg)';
				
				// Hide element after animation completes
				setTimeout(() => {
					if (!isDropdownOpen) {
						dropdown.style.display = 'none';
					}
				}, 300);
				
				isDropdownOpen = false;
			}
		});

		// Enhanced close dropdown function
		const closeDropdown = () => {
			if (isDropdownOpen) {
				dropdown.style.maxHeight = '0';
				dropdown.style.opacity = '0';
				dropdown.style.transform = 'translateY(-10px)';
				chevronIcon.style.transform = 'rotate(0deg)';
				
				setTimeout(() => {
					dropdown.style.display = 'none';
				}, 300);
				
				isDropdownOpen = false;
			}
		};

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			if (!profileContainer.contains(e.target as Node)) {
				closeDropdown();
			}
		});

		// Logout handler
		const logoutBtn = dropdown.querySelector('.logout-btn');
		logoutBtn?.addEventListener('click', () => {
			logout();
			closeDropdown();
			updateNavbar();
		});

		// Add click handlers for other dropdown items
		const dropdownItems = dropdown.querySelectorAll('.dropdown-item');
		dropdownItems.forEach(item => {
			item.addEventListener('click', (e) => {
				e.preventDefault();
				const link = e.currentTarget as HTMLAnchorElement;
				const screen = link.dataset.link;
				const tab = link.dataset.tab;
				if (screen) {
					navigate(screen as Screen, tab);
				}
				closeDropdown();
			});
		});

		profileContainer.appendChild(profileButton);
		profileContainer.appendChild(dropdown);
		authSection.appendChild(profileContainer);

	} else {
		// Login/SignUp Button - updated for transparency
		const loginButton = document.createElement('button');
		loginButton.className = 'bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border border-white/20';
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

	// Add the creative menu styles to the document head
	addCreativeMenuStyles();

	return navbar;
}

// Add CSS styles for the creative menu effect
function addCreativeMenuStyles(): void {
	// Check if styles already exist
	if (document.querySelector('#creative-menu-styles')) {
		return;
	}

	const styleSheet = document.createElement('style');
	styleSheet.id = 'creative-menu-styles';
	styleSheet.textContent = `
		@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@900&display=swap');
		
		/* Enhanced dropdown animations */
		.dropdown-menu {
			transform-origin: top center;
		}
		
		.dropdown-menu.sliding-down {
			animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		}
		
		.dropdown-menu.sliding-up {
			animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		}
		
		@keyframes slideDown {
			0% {
				max-height: 0;
				opacity: 0;
				transform: translateY(-10px) scaleY(0.95);
			}
			100% {
				max-height: 200px;
				opacity: 1;
				transform: translateY(0) scaleY(1);
			}
		}
		
		@keyframes slideUp {
			0% {
				max-height: 200px;
				opacity: 1;
				transform: translateY(0) scaleY(1);
			}
			100% {
				max-height: 0;
				opacity: 0;
				transform: translateY(-10px) scaleY(0.95);
			}
		}
		
		.creative-navigation {
			margin: 0;
			padding: 20px;
			list-style: none;
			background: linear-gradient(to bottom, #4B1B67, #872481, #DC25A3, #F34C94, #F3796A);
			min-height: 100vh;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}
		
		.creative-navigation__link {
			position: relative;
			display: block;
			font-family: "Poppins", sans-serif;
			font-weight: 900;
			font-size: 3rem;
			line-height: 1.2;
			text-decoration: none;
			color: transparent;
			-webkit-text-stroke: 2px #ffffff;
			-webkit-user-select: none;
			-moz-user-select: none;
			-ms-user-select: none;
			user-select: none;
			transition: all 0.3s ease;
			cursor: pointer;
			margin: 10px 0;
		}
		
		.creative-navigation__link:hover {
			color: #ffffff;
			-webkit-text-stroke: 2px transparent;
			transform: scale(1.05);
		}
		
		.creative-navigation__link:hover::before {
			transform: translate(8px, -8px);
			color: #9B5DE5;
			-webkit-text-stroke: 2px transparent;
		}
		
		.creative-navigation__link:hover::after {
			transform: translate(16px, -16px);
			color: #00FF85;
			-webkit-text-stroke: 2px transparent;
		}
		
		.creative-navigation__link::before,
		.creative-navigation__link::after {
			content: attr(data-text);
			position: absolute;
			top: 0;
			left: 0;
			z-index: -1;
			transition: transform 0.5s ease;
			-webkit-text-stroke: 2px transparent;
			pointer-events: none;
		}
		
		@media (max-width: 768px) {
			.creative-navigation__link {
				font-size: 2.5rem;
			}
		}
		
		@media (max-width: 480px) {
			.creative-navigation__link {
				font-size: 2rem;
			}
		}
	`;
	document.head.appendChild(styleSheet);
}

// Enhanced Mobile Menu with Creative Effects
function toggleMobileMenu(): void {
	let existingMenu = document.querySelector('.mobile-menu');

	if (existingMenu) {
		// Smooth fade out
		existingMenu.classList.add('opacity-0');
		setTimeout(() => existingMenu?.remove(), 200);
		return;
	}

	const mobileMenu = document.createElement('div');
	mobileMenu.className = 'mobile-menu fixed inset-0 z-50 opacity-0 transition-opacity duration-200';
	
	// Create the creative navigation overlay
	const overlay = document.createElement('div');
	overlay.className = 'creative-navigation';
	
	// Create navigation list
	const navList = document.createElement('ul');
	navList.className = 'creative-navigation-list';

	// Menu items with creative styling
	const menuItems = [
		{ text: 'Home', action: () => {
			navigate('landing' as Screen);
			closeMobileMenu();
		}},
		...(isAuthenticated() ? [
			{ text: 'Play Game', action: () => {
				// Add your play game navigation here
				navigate('main' as Screen);
				console.log('Navigate to play game');
				closeMobileMenu();
			}},
		] : [])
	];

	menuItems.forEach(item => {
		const listItem = document.createElement('li');
		listItem.className = 'creative-navigation__item';
		
		const link = document.createElement('a');
		link.className = 'creative-navigation__link';
		link.href = '#';
		link.setAttribute('data-text', item.text);
		link.textContent = item.text;
		
		link.addEventListener('click', (e) => {
			e.preventDefault();
			item.action();
		});
		
		listItem.appendChild(link);
		navList.appendChild(listItem);
	});

	// Add close button
	const closeButton = document.createElement('button');
	closeButton.className = 'absolute top-6 right-6 text-white text-4xl hover:text-red-400 transition-colors duration-200';
	closeButton.innerHTML = '×';
	closeButton.addEventListener('click', closeMobileMenu);

	overlay.appendChild(closeButton);
	overlay.appendChild(navList);
	mobileMenu.appendChild(overlay);

	// Close menu when clicking outside navigation links
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) {
			closeMobileMenu();
		}
	});

	document.body.appendChild(mobileMenu);
	
	// Trigger fade in
	setTimeout(() => {
		mobileMenu.classList.remove('opacity-0');
	}, 10);

	// Prevent body scroll
	document.body.style.overflow = 'hidden';
}

function closeMobileMenu(): void {
	const mobileMenu = document.querySelector('.mobile-menu');
	if (mobileMenu) {
		mobileMenu.classList.add('opacity-0');
		setTimeout(() => {
			mobileMenu.remove();
			document.body.style.overflow = '';
		}, 200);
	}
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

	// Remove fixed padding since navbar is now truly transparent
	// The content will flow behind the navbar
	document.body.style.paddingTop = '0px';
}