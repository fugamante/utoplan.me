(function() {
  // Use JavaScript Strict Mode.
  "use strict";
  var controller = require('controller'); // Sync loading of a script in the module directory

  // Get global DOM Elements
  var sidebar = document.getElementById("sidebar");

  // Main function
  function init() {

    //Animate HTML.
    document.getElementsByID('arrowHide').onclick = function() {
      if (this.innerHTML === "&#9658;") {
        this.innerHTML = '&#9659;';
        sidebar.classList.add('horizTranslate');
      } else {
        this.innerHTML = '&#9658;';
        var computedStyle = window.getComputedStyle(sidebar),
            animationEnd = computedStyle.getPropertyValue('horizTranslate');
        sidebar.style.marginLeft = animationEnd;
        sidebar.classList.remove('horizTranslate');
      }
      console.log(sidebar);
    }
    // Drop down layer list.
    document.getElementById("searchForm").onsubmit = function() { search(myForm); };

    // JAVIER'S TESTING ZONE
    pushStream( {title:"County Business Patterns", content:"<h2>Average Anual Payroll per Business</h2><p>NAIC: 34</p><p>$55,692</p>", relatedContent:"See: <a href='#'>Related Content 1</a>"} );
  }

  // Push data to sidebar
  function pushStream( elementData ) {
    var element, title, content, relatedContent;
    // Parse values
    if (elementData.hasOwnProperty('title'))
      title = element.title;
    if (elementData.hasOwnProperty('content'))
      content.innerHTML(content);
    if (elementData.hasOwnProperty('relatedContent'))
      content.innerHTML(relatedContent);

    // Structure Title
    element = document.createElement("LI");
    //title = document.createTextNode(title);
    title = document.createElement("H1").innerHTML(title);

    // Insert content to LI
    element.appendChild(title);
    element.appendChild(content);
    element.appendChild(relatedContent);
  }

  // Determine what plug-ins should attend the query.
  function search() {
    // To be implemented.
    // Continue to run
  }

  // Initialize objects after DOM is loaded
  if (document.readyState === "interactive" || document.readyState === "complete")
    // Call init if the DOM (interactive) or document (complete) is ready.
    init();
  else
    // Set init as a listener for the DOMContentLoaded event.
    document.addEventListener("DOMContentLoaded", init);
}());
