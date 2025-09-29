export function MainPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-b from-[#4B1B67] via-[#872481] via-[#DC25A3] via-[#F34C94] to-[#F3796A] pt-16';

  const content = document.createElement('div');
  content.className = 'max-w-4xl mx-auto px-4 py-12 text-center';
  
  content.innerHTML = `
    <div class="mb-12">
      <div class=">
	  </div>
    </div>
    
    `;
  
  container.appendChild(content);
  return container;
}