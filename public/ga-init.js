/* Google Analytics bootstrap. A static file on purpose: the strict Content-Security-Policy on
   the signed-in app allows scripts from this origin and nonced inline scripts only, and the
   inline form of this bootstrap never received the nonce, so the dashboard blocked it. The
   measurement id is applied by the config call in GoogleAnalytics.tsx, not here. */
window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
window.gtag = gtag;
gtag('js', new Date());
