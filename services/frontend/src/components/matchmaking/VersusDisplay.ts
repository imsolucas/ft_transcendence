export function createVersusDisplay(status: 'searching' | 'found'): string {
	if (status === 'searching') {
		return `
			<div class="flex flex-col items-center justify-center text-center">
				<div class="font-['Press_Start_2P'] text-4xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-2 lg:mb-4">VS</div>
				<div class="searching-dots text-2xl text-white flex gap-1">
					<span>.</span><span>.</span><span>.</span>
				</div>
			</div>
		`;
	}

	return `
		<div class="text-center">
			<div class="relative">
				<!-- Animated Pong Table -->
				<div class="relative bg-black/60 border-4 border-white/40 rounded-lg p-6 h-48 md:h-64 overflow-hidden mx-auto max-w-md">
					<!-- Pong Table -->
					<div class="relative w-full h-full border-2 border-white rounded-lg">
						<!-- Center Line -->
						<div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-white opacity-30">
							<div class="w-full h-6 bg-white"></div>
							<div class="w-full h-6 bg-transparent"></div>
							<div class="w-full h-6 bg-white"></div>
							<div class="w-full h-6 bg-transparent"></div>
							<div class="w-full h-6 bg-white"></div>
							<div class="w-full h-6 bg-transparent"></div>
							<div class="w-full h-6 bg-white"></div>
							<div class="w-full h-6 bg-transparent"></div>
						</div>

						<!-- Paddles -->
						<div class="paddle-left absolute w-3 h-16 bg-indigo-500 left-3"></div>
						<div class="paddle-right absolute w-3 h-16 bg-blue-500 right-3"></div>

						<!-- Ball -->
						<div class="pong-ball absolute w-4 h-4 bg-white rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
					</div>
				</div>

				<!-- VS Text -->
				<div class="mt-6">
					<div class="font-['Press_Start_2P'] text-4xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-4">VS</div>
					<div class="text-green-400 text-lg font-['Orbitron']">
						Match Found!
					</div>
				</div>
			</div>
		</div>
	`;
}
