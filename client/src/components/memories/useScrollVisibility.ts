import { useEffect, type MutableRefObject } from 'react';

export function useScrollVisibility(
    itemRefs: MutableRefObject<Map<string, HTMLElement>>,
    classToToggle: string,
    dependencies: any[] = []
) {
    useEffect(() => {
        const observerOptions: IntersectionObserverInit = {
            root: null, // viewport
            rootMargin: '-10% 0px -30% 0px', // Trigger in the "sweet spot"
            threshold: [0, 0.25, 0.5, 0.75, 1],
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
                    entry.target.classList.add(classToToggle);
                }
            });
        }, observerOptions);

        // Observe all refs
        itemRefs.current.forEach((element) => {
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [itemRefs, classToToggle, ...dependencies]);
}
