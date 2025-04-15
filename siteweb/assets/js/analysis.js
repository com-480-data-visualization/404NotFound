//Extract the "focus" parameter form the URL
function getFocusParameter() {
    const params = new URLSearchParams(window.location.search);
    return params.get("focus") || "Feature";
  }

// Capitalize the first letter of a word
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

const focusDisplayNames = {
    gross: "Box office revenue",
    awards: "Awards sucess",
    audience: "IMDb Ratings",
  };

// Get the focus keyword from the URL
const focus = getFocusParameter();

const displayFocus = focusDisplayNames[focus]
 
// Update the HTML content on the page with the dynamic focus name
document.getElementById("Feature").textContent = capitalize(focus);
document.getElementById("focus-word").textContent = displayFocus;
  

  