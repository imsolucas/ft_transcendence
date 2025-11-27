export function createVersusDisplay(status: 'searching' | 'found'): string {
	return `
		<div class="flex flex-col items-center justify-center text-center">
			<div class="font-['Press_Start_2P'] text-4xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-2 lg:mb-4">VS</div>
			${ status == 'searching' ? "<div class=\"searching-dots text-2xl text-white flex gap-1\"> \
				<span>.</span><span>.</span><span>.</span> \
			</div>" : ''}
			</dib>
		</div>
	`;
}
