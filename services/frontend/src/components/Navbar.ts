import { isAuthenticated, getCurrentUser, logout } from '../utils/auth-script';
import { navigate } from '../router';
import type { Screen } from '../router';
import { LanguageSelector } from './LanguageSelector';
import { t } from '../i18n';

export async function createNavbar(): Promise<HTMLElement> {
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

	// Navbar Toggle Button (Hide/Show for fullscreen)
	const navbarToggleBtn = document.createElement('button');
	navbarToggleBtn.className = 'flex items-center justify-center p-2 rounded-lg transition-all duration-200 hover:bg-white/20 cursor-pointer border border-white/30 bg-white/10 backdrop-blur-sm';
	const toggleNavbarText = String(t('navbar.toggleNavbar') || 'Toggle Navbar');
	navbarToggleBtn.title = toggleNavbarText;
	navbarToggleBtn.setAttribute('aria-label', toggleNavbarText);
	navbarToggleBtn.id = 'navbar-toggle-btn';
	
	const isNavbarHidden = localStorage.getItem('navbarHidden') === 'true';
	
	// Arrow icon image (up when navbar visible, down when hidden)
	const arrowIcon = document.createElement('img');
	arrowIcon.className = 'w-5 h-5 object-contain transition-transform duration-200';
	arrowIcon.src = isNavbarHidden ? '/images/down.png' : '/images/up.png';
	arrowIcon.alt = isNavbarHidden ? 'Show navbar' : 'Hide navbar';
	
	navbarToggleBtn.appendChild(arrowIcon);
	
	navbarToggleBtn.addEventListener('click', (e) => {
		e.stopPropagation();
		toggleNavbarVisibility();
	});
	
	rightSection.appendChild(navbarToggleBtn);

	// Language Selector
	const languageSelector = LanguageSelector();
	rightSection.appendChild(languageSelector);

	// Auth Section
	const authSection = document.createElement('div');
	authSection.className = 'flex items-center';

	if (isAuthenticated()) {
		const user = await getCurrentUser();
		// console.log("user:", user);
		const profileContainer = document.createElement('div');
		profileContainer.className = 'relative';

		const profileButton = document.createElement('button');
		profileButton.className = 'flex items-center space-x-2 p-1 rounded-full hover:bg-white/10 transition-colors duration-200';

		// Use Google profile picture if available
		let profileImg: HTMLElement;
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
		${t('navbar.profile')}
	  </a>
	  <a href="#" data-link="profile" data-tab="friends" class="dropdown-item block px-4 py-2 text-sm text-[#00FF85] hover:bg-gray-100/80 transition-colors">
		${t('navbar.friends')}
	  </a>
	  <a href="#" data-link="profile" data-tab="match-history" class="dropdown-item block px-4 py-2 text-sm text-[#00FF85] hover:bg-gray-100/80 transition-colors">
		${t('navbar.gameHistory')}
	  </a>
	  <hr class="my-1">
	  <button class="logout-btn w-full text-left px-4 py-2 text-sm text-[#2BD2FF] hover:bg-red-50/80 transition-colors">
		${t('navbar.logout')}
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
		loginButton.textContent = String(t('navbar.loginSignup'));
		loginButton.addEventListener('click', () => {
			navigate('auth' as Screen);
		});

		authSection.appendChild(loginButton);
	}
	rightSection.appendChild(authSection);

	// Assemble navbar
	navContent.appendChild(leftSection);
	navContent.appendChild(rightSection);
	container.appendChild(navContent);
	navbar.appendChild(container);

	// Add the creative menu styles to the document head
	addCreativeMenuStyles();

	// Apply initial state if navbar was hidden (reuse the variable declared earlier)
	if (isNavbarHidden) {
		navbar.style.transform = 'translateY(-100%)';
		navbar.style.opacity = '0';
	}
	navbar.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';

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
		{ text: t('navbar.home'), action: () => {
			navigate('landing' as Screen);
			closeMobileMenu();
		}},
		...(isAuthenticated() ? [
			{ text: t('navbar.playGame'), action: () => {
				// Add your play game navigation here
				navigate('lobby' as Screen);
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
		link.setAttribute('data-text', String(item.text));
		link.textContent = String(item.text);
		
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
export async function updateNavbar(): Promise<void> {
	const existingNavbar = document.querySelector('nav') as HTMLElement | null;
	const wasHidden = existingNavbar && existingNavbar.style.transform === 'translateY(-100%)';
	if (existingNavbar) {
		const newNavbar = await createNavbar();
		existingNavbar.replaceWith(newNavbar);
		// Restore hidden state if it was hidden
		if (wasHidden) {
			newNavbar.style.transform = 'translateY(-100%)';
			newNavbar.style.opacity = '0';
			createFloatingToggleButton();
		} else {
			removeFloatingToggleButton();
		}
	}
}

// Toggle navbar visibility for fullscreen gameplay
export function toggleNavbarVisibility(): void {
	const navbar = document.querySelector('nav') as HTMLElement;
	if (!navbar) return;

	const isHidden = navbar.style.transform === 'translateY(-100%)';
	
	if (isHidden) {
		// Show navbar
		navbar.style.transform = 'translateY(0)';
		navbar.style.opacity = '1';
		localStorage.setItem('navbarHidden', 'false');
		// Remove floating button
		removeFloatingToggleButton();
	} else {
		// Hide navbar
		navbar.style.transform = 'translateY(-100%)';
		navbar.style.opacity = '0';
		localStorage.setItem('navbarHidden', 'true');
		// Add floating button
		createFloatingToggleButton();
	}

	// Update toggle button arrow icon image
	const toggleBtn = navbar.querySelector('#navbar-toggle-btn') as HTMLElement;
	if (toggleBtn) {
		const iconImg = toggleBtn.querySelector('img');
		if (iconImg) {
			if (isHidden) {
				// Now showing navbar → next action hides it
				iconImg.src = '/images/up.png';
				iconImg.alt = 'Hide navbar';
			} else {
				// Now hiding navbar → next action shows it
				iconImg.src = '/images/down.png';
				iconImg.alt = 'Show navbar';
			}
		}
	}
}

// Create floating toggle button when navbar is hidden
function createFloatingToggleButton(): void {
	// Remove existing floating button if any
	removeFloatingToggleButton();

	const floatingBtn = document.createElement('button');
	floatingBtn.id = 'floating-navbar-toggle';
	floatingBtn.className = 'fixed top-4 right-4 z-50 flex items-center justify-center w-10 h-10 bg-[#F34C94]/90 hover:bg-[#F34C94] backdrop-blur-sm rounded-full shadow-lg border-2 border-white/20 transition-all duration-200 hover:scale-110 cursor-pointer';
	const floatingBtnText = String(t('navbar.toggleNavbar') || 'Show Navbar');
	floatingBtn.title = floatingBtnText;
	
	const icon = document.createElement('img');
	icon.className = 'w-5 h-5 object-contain';
	icon.src = '/images/down.png';
	icon.alt = 'Toggle navbar';
	
	floatingBtn.appendChild(icon);
	floatingBtn.addEventListener('click', () => {
		toggleNavbarVisibility();
	});
	
	document.body.appendChild(floatingBtn);
}

// Remove floating toggle button
function removeFloatingToggleButton(): void {
	const existingBtn = document.getElementById('floating-navbar-toggle');
	if (existingBtn) {
		existingBtn.remove();
	}
}

// Initialize navbar
export async function initializeNavbar(): Promise<void> {
	const navbar = await createNavbar();
	document.body.insertBefore(navbar, document.body.firstChild);

	// Remove fixed padding since navbar is now truly transparent
	// The content will flow behind the navbar
	document.body.style.paddingTop = '0px';
	
	// Apply initial navbar state (hidden or visible)
	const isNavbarHidden = localStorage.getItem('navbarHidden') === 'true';
	if (isNavbarHidden) {
		navbar.style.transform = 'translateY(-100%)';
		navbar.style.opacity = '0';
		// Create floating button if navbar is hidden
		createFloatingToggleButton();
	}
	
	// Add smooth transition
	navbar.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
	
	// Listen for auth expiration events
	window.addEventListener('authExpired', async () => {
		await updateNavbar();
	});
}