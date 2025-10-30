# Performance Optimization Plan

This document outlines a step-by-step plan to improve the performance of the readme-generator-mvp application. Follow these tasks sequentially to ensure a smooth and safe implementation.

---

### Task 1: Analyze and Diagnose (Foundation)

Before making changes, we need to establish a baseline and identify the exact sources of the large bundle size.

*   **1.1: Set up Bundle Analyzer**
    *   **What:** Install and configure `@next/bundle-analyzer` to visualize the JavaScript bundle composition.
    *   **How:**
        1.  Install the package: `npm install @next/bundle-analyzer`
        2.  Update `next.config.ts` to enable the analyzer. You can configure it to run when you build the project with a specific environment variable (e.g., `ANALYZE=true npm run build`).

*   **1.2: Identify Largest Modules**
    *   **What:** Run the bundle analyzer and create a list of the top 5-10 largest modules or libraries contributing to the bundle size.
    *   **How:**
        1.  Run the build with the analyzer enabled.
        2.  Review the generated report and note down the biggest offenders. This list will be our primary target for optimizations in Task 3.

---

### Task 2: Fix Layout Shifts (CLS)

This task focuses on stabilizing the page layout during load, which is a critical user experience improvement.

*   **2.1: Implement `next/image`**
    *   **What:** Replace all standard `<img>` tags with the Next.js `<Image>` component.
    *   **How:**
        1.  Search the project for all `<img>` tags. Key files are likely `src/components/ui/RepositoryCard.tsx`, `src/components/layout/Header.tsx`, and any other components in `src/components/`.
        2.  Import `Image` from `next/image`.
        3.  Replace each `<img>` tag. You will need to provide `width` and `height` props. For external images (like GitHub avatars), you'll also need to configure `next.config.ts` to allow the domain.

*   **2.2: Optimize Font Loading**
    *   **What:** Use `next/font` to handle font loading efficiently and prevent layout shifts.
    *   **How:**
        1.  Identify the fonts used in your application (likely in `src/app/globals.css`).
        2.  In `src/app/layout.tsx`, import the desired font from `next/font` (e.g., `next/font/google`).
        3.  Apply the font to your layout. This will ensure fonts are preloaded and managed correctly.

*   **2.3: Add Loading Skeletons**
    *   **What:** Create and implement skeleton loaders for the repository list to prevent content from "popping in" and shifting the layout.
    *   **How:**
        1.  Create a new component: `src/components/ui/RepositoryCardSkeleton.tsx`. This component will mimic the layout of `RepositoryCard.tsx` but with placeholder visuals (e.g., grey boxes).
        2.  In `src/app/repositories/page.tsx`, while the repository data is loading, render a list of these skeleton components instead of a loading spinner. This reserves the space that the actual cards will occupy.

---

### Task 3: Reduce JavaScript Bundle Size

This is the most impactful task for improving initial load time. We will use the analysis from Task 1.

*   **3.1: Dynamically Import Heavy Components**
    *   **What:** Use `next/dynamic` to code-split components that are not needed immediately on page load.
    *   **How:**
        1.  Based on your bundle analysis, identify heavy components. A likely candidate is `MarkdownEditor.tsx`, as rich text editors are often large.
        2.  Use `dynamic` from `next/dynamic` to import these components. For example: `const DynamicMarkdownEditor = dynamic(() => import('../components/ui/MarkdownEditor'), { ssr: false, loading: () => <p>Loading...</p> })`.
        3.  This will create a separate JavaScript chunk for the editor that only loads when it's rendered.

*   **3.2: Prune Unused Dependencies**
    *   **What:** Review `package.json` and remove any libraries that are no longer used.
    *   **How:**
        1.  Go through each dependency in `package.json`.
        2.  Search the codebase to see if it is imported and used.
        3.  If a dependency is not used, uninstall it using `npm uninstall <package-name>`.

---

### Task 4: Optimize Rendering and Data Fetching

This task focuses on making the application feel more responsive by reducing unnecessary work on the client.

*   **4.1: Optimize Client-Side Data Fetching**
    *   **What:** Prevent multiple, redundant API calls for the same data, specifically for the user session.
    *   **How:**
        1.  The `useAuth` hook likely fetches the session. Instead of fetching on every call, fetch it once and store it in a React Context.
        2.  Create an `AuthProvider` that wraps your application layout. This provider will fetch the session and make it available to all child components via a context hook. This avoids components re-fetching the same data.

*   **4.2: Memoize Components**
    *   **What:** Prevent unnecessary re-renders of components, especially in lists.
    *   **How:**
        1.  Wrap the `RepositoryCard.tsx` component in `React.memo`.
        2.  When you render a list of these cards, ensure you provide a stable `key` prop (e.g., `key={repo.id}`).
        3.  This will prevent all cards from re-rendering if only one item in the list changes.

---

### Task 5: Verify Improvements

After each major task, you should verify that the changes have had a positive impact and have not introduced regressions.

*   **5.1: Re-run Lighthouse**
    *   **What:** Generate a new Lighthouse report.
    *   **How:** After completing a major task (e.g., after finishing all of Task 2), run Lighthouse again and compare the new scores (especially LCP, CLS, and TBT) to your baseline.

*   **5.2: Re-run Bundle Analyzer**
    *   **What:** After completing Task 3, generate a new bundle analysis report.
    *   **How:** Run `ANALYZE=true npm run build` and compare the new bundle sizes to the previous report to confirm your optimizations were effective.
