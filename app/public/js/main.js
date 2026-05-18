(function(document) {
  "use strict";

  function findUi(name) {
    return document.querySelector('[data-ui="' + name + '"]');
  }

  function findAllUi(name) {
    return document.querySelectorAll('[data-ui="' + name + '"]');
  }

  function setVisible(element, visible) {
    element.style.display = visible ? "block" : "none";
  }

  function isVisible(element) {
    return window.getComputedStyle(element).display !== "none";
  }

  function toggleEyeState(element) {
    var isOpen = element.classList.contains("eyeOpened");
    element.classList.toggle("eyeOpened", !isOpen);
    element.classList.toggle("eyeClosed", isOpen);
  }

  function bindLayerToggles() {
    var layers = findAllUi("layer-visibility");

    for (var i = 0; i < layers.length; i++) {
      layers[i].addEventListener("click", function(event) {
        event.preventDefault();
        toggleEyeState(event.currentTarget);
      });
    }
  }

  function bindPanelToggles() {
    var sidebar = findUi("sidebar");
    var sidebarToggle = findUi("sidebar-toggle");
    var queryList = findUi("layer-menu");
    var queryToggle = findUi("layer-menu-toggle");

    setVisible(sidebar, false);

    sidebarToggle.addEventListener("click", function() {
      var shouldShow = !isVisible(sidebar);
      setVisible(sidebar, shouldShow);
      sidebarToggle.innerHTML = shouldShow ? "&#9658;" : "&#9668;";
    });

    queryToggle.addEventListener("click", function(event) {
      event.preventDefault();
      setVisible(queryList, !isVisible(queryList));
    });
  }

  function init() {
    bindLayerToggles();
    bindPanelToggles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}(document));
