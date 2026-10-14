/**
 * Serialise a JSON-LD object for a `<script type="application/ld+json">` body.
 *
 * Plain JSON.stringify is not safe there: a string containing `</script>` closes the element
 * early and anything after it runs as HTML. Escaping `<`, `>` and `&` as \u escapes keeps the
 * JSON identical once parsed while leaving nothing the HTML parser can act on. U+2028 and U+2029
 * are escaped as well because they are line terminators in older JavaScript parsers.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
