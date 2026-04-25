window.__creatorSmokeAlerts = [];
window.__BLOCKHERO_CREATOR_TEST__ = true;
window.alert = message => {
  window.__creatorSmokeAlerts.push(String(message));
};
