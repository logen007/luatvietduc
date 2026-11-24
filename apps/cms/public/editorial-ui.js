// Compatibility for bookmarked hash URLs. Native pages own rendering; the
// retained legacy renderer below stays inactive without its original globals.
(()=>{
 if(!document.documentElement.hasAttribute('data-lvd-native'))return;
 const redirect=async()=>{if(!location.hash.startsWith('#/'))return;const {legacyTarget}=await import('/public-shell.mjs');const target=legacyTarget(location.hash);if(target)location.replace(target);};
 window.addEventListener('hashchange',()=>void redirect().catch(()=>{}));
 void redirect().catch(()=>{});
})();
