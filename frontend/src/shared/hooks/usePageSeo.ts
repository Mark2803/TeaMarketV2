import { useEffect } from "react";

type SeoOptions = {
  title: string;
  description?: string | null;
  canonicalPath: string;
  canonicalUrl?: string | null;
  indexed: boolean;
};

const SITE = "https://tea-master-team.ru";

export function usePageSeo(options: SeoOptions | null): void {
  useEffect(() => {
    if (!options) return;

    const previousTitle = document.title;
    const head = document.head;
    const owned: HTMLElement[] = [];

    const setMeta = (name: string, value: string) => {
      let element = head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      const previous = element?.getAttribute("content") ?? null;
      if (!element) {
        element = document.createElement("meta");
        element.name = name;
        head.appendChild(element);
        owned.push(element);
      }
      element.content = value;
      return () => {
        if (previous !== null) element!.content = previous;
      };
    };

    const restoreDescription = setMeta("description", options.description?.trim() || options.title);
    const restoreRobots = setMeta("robots", options.indexed ? "index, follow" : "noindex, follow");
    const restoreYandex = setMeta("yandex", options.indexed ? "index, follow" : "noindex, follow");

    let canonical = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = canonical?.getAttribute("href") ?? null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      head.appendChild(canonical);
      owned.push(canonical);
    }
    const fallback = SITE + options.canonicalPath;
    const candidate = options.canonicalUrl?.trim();
    canonical.href = candidate && /^https:\/\//i.test(candidate) ? candidate : fallback;
    document.title = options.title;

    return () => {
      document.title = previousTitle;
      restoreDescription();
      restoreRobots();
      restoreYandex();
      if (previousCanonical !== null) canonical!.href = previousCanonical;
      for (const element of owned) element.remove();
    };
  }, [options?.title, options?.description, options?.canonicalPath, options?.canonicalUrl, options?.indexed]);
}
