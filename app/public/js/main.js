(function(document) {
  "use strict";

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
    var layers = document.getElementsByClassName("eye");

    for (var i = 0; i < layers.length; i++) {
      layers[i].addEventListener("click", function(event) {
        event.preventDefault();
        toggleEyeState(event.currentTarget);
      });
    }
  }

  function bindPanelToggles() {
    var sidebar = document.getElementById("sidebar");
    var sidebarToggle = document.getElementById("toogle");
    var queryList = document.getElementById("queryList");
    var queryToggle = document.getElementById("dropDownButton");

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
