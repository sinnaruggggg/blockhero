window.__creatorSmokeAlerts = [];
window.alert = message => {
  window.__creatorSmokeAlerts.push(String(message));
};
