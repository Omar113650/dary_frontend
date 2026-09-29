/**
 * Global Anti-Double-Click and Anti-Double-Submit Protector
 * Automatically guards all buttons, interactive elements, and forms across the entire application:
 * 1. Blocks rapid duplicate clicks (< 450ms) on the same button/action.
 * 2. Blocks rapid duplicate submissions (< 600ms) on forms.
 * 3. Immediately swallows click events on disabled or busy elements during capture phase.
 * 4. Ensures instant responsiveness on touch/mobile devices without delay.
 */

export function setupAntiDoubleSubmit(): void {
  if (typeof document === 'undefined') return;

  // Intercept button & action clicks in capture phase
  document.addEventListener(
    'click',
    (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest<HTMLElement>(
        'button, [role="button"], input[type="submit"], input[type="button"], a.btn, a.button, .dary-btn, .dary-icon-btn, .dary-action-btn'
      );
      if (!interactive) return;

      // 1. If element is disabled, marked aria-disabled, or busy, block event immediately
      if (
        interactive.hasAttribute('disabled') ||
        interactive.getAttribute('aria-disabled') === 'true' ||
        interactive.classList.contains('disabled') ||
        interactive.classList.contains('is-submitting')
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      // 2. Prevent rapid double-clicks (< 450ms)
      const now = Date.now();
      const lastClick = Number(interactive.dataset.lastActionClick || '0');
      if (lastClick && now - lastClick < 450) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      interactive.dataset.lastActionClick = String(now);
    },
    true // Capture phase: intercepts before React or other bubble handlers
  );

  // Intercept form submissions in capture phase
  document.addEventListener(
    'submit',
    (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;

      const now = Date.now();
      const lastSubmit = Number(form.dataset.lastFormSubmit || '0');
      if (lastSubmit && now - lastSubmit < 600) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }

      form.dataset.lastFormSubmit = String(now);
    },
    true // Capture phase
  );
}
