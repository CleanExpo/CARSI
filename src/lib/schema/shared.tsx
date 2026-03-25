/**
 * Shared SchemaMarkup server component and base types.
 * Import from here to render any schema.org JSON-LD script tag.
 */

export type SchemaObject = Record<string, unknown>;

/**
 * Server component that renders a schema.org JSON-LD <script> tag.
 * Use this as the rendering layer for all lib/schema/* generators.
 */
export function SchemaMarkup({ schema }: { schema: SchemaObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
