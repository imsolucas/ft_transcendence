// Type declarations for Alpine.js
declare module 'alpinejs' {
  interface Alpine {
    start(): void;
    stop(): void;
    data(name: string, callback: () => any): void;
    store(name: string, value: any): void;
    version: string;
    initTree?(el: Element): void; // Firefox compatibility: manually initialize Alpine tree
  }

  const Alpine: Alpine;
  export default Alpine;
}

// Extend HTMLElement to include Alpine.js internal state
declare global {
  interface HTMLElement {
    __x?: {
      $data: Record<string, any>;
      $el: HTMLElement;
      $refs: Record<string, HTMLElement>;
      $watch: (property: string, callback: (value: any) => void) => void;
      $nextTick: (callback: () => void) => void;
    };
  }
}

export {};

