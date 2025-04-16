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

let dataset = [];

fetch('assets/data/data_v2.csv')
  .then(response => response.text())
  .then(text => {
    dataset = d3.csvParse(text);
    updateStats(dataset);
    categoryFilter.addEventListener("change", function () {
      updateStats(dataset);
    })
  });

//Filter date
function filterByDate(data, minYear, maxYear) {
  return data.filter(d => {
    const year = parseInt(d.year);
    return year >= minYear && year <= maxYear;
  });
}

function updateStats(data) {
  const minYear = 1960;
  const maxYear = 2025;
  const filtered = filterByDate(data, minYear, maxYear);

  document.getElementById("total_movies").textContent = filtered.length;
}

