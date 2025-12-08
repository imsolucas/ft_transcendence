export function createProfileStyles(): string {
  return `
    <style>
      /* Tab Active States */
      .tab-btn.active {
        color: #00ffff;
        border-bottom-color: #00ffff;
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
        animation: fadeIn 0.3s ease-in;
      }

      /* Grid Pattern for Background */
      .grid-pattern {
        background-image:
          linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
        background-size: 50px 50px;
        width: 100%;
        height: 100%;
      }

      /* Animation Delay for Orbs */
      .animation-delay-500 {
        animation-delay: 500ms;
      }

      /* Fade In Animation */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Spin Animation for Loading */
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .animate-spin {
        animation: spin 1s linear infinite;
      }

      /* Pulse Animation */
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      /* Scrollbar Styling */
      .tabs::-webkit-scrollbar {
        height: 4px;
      }

      .tabs::-webkit-scrollbar-track {
        background: rgba(0, 255, 255, 0.1);
        border-radius: 2px;
      }

      .tabs::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 255, 0.3);
        border-radius: 2px;
      }

      .tabs::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 255, 255, 0.5);
      }

      /* Modal Backdrop Blur */
      @supports (backdrop-filter: blur(10px)) {
        .backdrop-blur-sm {
          backdrop-filter: blur(10px);
        }
      }
    </style>
  `;
}
