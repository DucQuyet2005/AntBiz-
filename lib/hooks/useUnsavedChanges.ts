import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to warn user before leaving page with unsaved changes
 * Handles:
 * - beforeunload event (page refresh/close)
 * - route navigation (Link click, useRouter.push)
 * - Navigation via Sidebar menu
 */
export function useUnsavedChanges(hasUnsaved: boolean, message?: string) {
  const router = useRouter();

  useEffect(() => {
    if (!hasUnsaved) return;

    const defaultMessage = 'You have unsaved changes. Do you want to leave?';
    const warningMessage = message || defaultMessage;

    // Handle page refresh/close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // Intercept sidebar menu clicks (detect href attribute on clicked elements)
    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicked element or parent has href attribute (Link component)
      let linkElement = target.closest('a[href]') as HTMLAnchorElement;

      if (linkElement && !linkElement.href.includes('#')) {
        // Check if it's navigating to a different page
        const href = linkElement.getAttribute('href');
        const currentPath = window.location.pathname;

        if (href && href !== currentPath && !href.startsWith('http')) {
          e.preventDefault();
          if (confirm(warningMessage)) {
            // User confirmed, proceed with navigation
            window.location.href = href;
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClickCapture, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClickCapture, true);
    };
  }, [hasUnsaved, message]);
}

