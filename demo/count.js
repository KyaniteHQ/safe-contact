// The "hidden links" counter on the demo page.
const count = document.getElementById("count");
const update = () => { count.textContent = document.querySelectorAll("[data-safe-contact]").length; };
new MutationObserver(update).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-safe-contact"] });
update();
