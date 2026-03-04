import { BlogSection } from "./BlogSection";
import { SNSSection } from "./SNSSection";

/**
 * PublishPanel -- Left sidebar panel for the content publishing pipeline.
 *
 * Combines the Blog and SNS sections into a single scrollable panel.
 * This panel is displayed when the user selects the "Publish" sidebar tab.
 *
 * Layout:
 * - Blog section header with "Draft Blog from Logs" button
 * - Blog drafts list with status badges (Draft/Reviewed/Published)
 * - Separator
 * - SNS section header with "Draft X Post" and "Draft Threads Post" buttons
 * - Post history list with platform icons and success/failure badges
 */
export function PublishPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div
        className="flex items-center px-3 py-2"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          Publishing
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-4">
        {/* Blog section */}
        <BlogSection />

        {/* Separator */}
        <div
          style={{
            height: 1,
            backgroundColor: "var(--color-border-subtle)",
          }}
        />

        {/* SNS section */}
        <SNSSection />
      </div>
    </div>
  );
}
