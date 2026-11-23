/* Google Analytics bootstrap. A static file on purpose: the strict Content-Security-Policy on
   the signed-in app allows scripts from this origin and nonced inline scripts only, and the
   inline form of this bootstrap never received the nonce, so the dashboard blocked it. The
   measurement id is applied by the config call in GoogleAnalytics.tsx, not here.
   This file is only loaded after the visitor has said yes to analytics (GP-731), so analytics
   storage starts granted; every advertising signal stays denied. */
window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
window.gtag = gtag;
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted',
});
gtag('js', new Date());
