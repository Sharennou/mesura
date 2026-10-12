// A fixed script can be allowed by hash in the local CSP. It only selects the
// initial public HTML; authentication still comes exclusively from the SDK/API.
export const ENTRY_BOOTSTRAP = `(()=>{try{const p=new URLSearchParams(location.search);if(!navigator.onLine||["token","reset","auth_error","code"].some(k=>p.has(k))||location.hash==="#legal"||/access_token=|error=/.test(location.hash)||Object.keys(localStorage).some(k=>k.startsWith("sb-")&&k.endsWith("-auth-token")))document.documentElement.dataset.entry="dynamic"}catch{document.documentElement.dataset.entry="dynamic"}})();`;
