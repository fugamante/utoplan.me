(function() {
  // Use JavaScript Strict Mode.
  "use strict";

  // Get global DOM Elements
  //var sidebar = document.getElementById("sidebar");

  // Main function
  function init() {
    // Load possible
    var layers = document.getElementsByClassName("eye"),
      layersLength = layers.length;
    for (var layer in layers) {
      layer.onclick = function(){
        if (!layer.className.match("eyeOpened")) {
          layer.className += "eyeOpened";
        } else {
          layer.className.replace( /(?:^|\s)eyeOpened(?!\S)/g , '' );
        }
      };
    }

    /*
    // Drop down layer list.
    document.getElementById("searchForm").onsubmit = function() { search(myForm); };
*/
    // JAVIER'S TESTING ZONE
    //pushStream( {title:"County Business Patterns", content:"<h2>Average Anual Payroll per Business</h2><p>NAIC: 34</p><p>$55,692</p>", relatedContent:"See: <a href='#'>Related Content 1</a>"} );
  }

  // Create HTML Elements
  function createHTMLFragment(htmlStr) {
    var frag = document.createDocumentFragment(),
        temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
    }
    return frag;
  }
  // Push data to sidebar
  function pushStream( elementData ) {
    var element, title, content, relatedContent;
    element = document.createDocumentFragment();
    // Parse values
    //if (elementData.hasOwnProperty('title'))
    //  document.createElement('div').innerHTML( "<h1>"+elementData.title+"</h1>" );
    if (elementData.hasOwnProperty('content'))
      element.innerHTML (createHTMLFragment( elementData.content ) );
    if (elementData.hasOwnProperty('relatedContent'))
      element( createHTMLFragment( elementData.relatedContent ) );
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
