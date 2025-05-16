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

const categoryFilter = document.getElementById("category-filter");

let dataset = [];

// TO DO FILTER INPUT YEAR
const minYear = 1960;
const maxYear = 2025;

fetch('assets/data/data_v2.csv')
    .then(response => response.text())
    .then(text => {
      dataset = d3.csvParse(text);
      dataset = filterByDate(dataset, minYear, maxYear);

      const defaultL1 = "genre";
      const defaultL2 = "budget";
      const defaultL3 = "language";

      if (isValidSelection(defaultL1, defaultL2, defaultL3)) {
        layer1.value = defaultL1;
        layer2.value = defaultL2;
        layer3.value = defaultL3;
        drawBubbleChart(dataset, defaultL1, defaultL2, defaultL3);
      }

      // Attacher les listeners
      [layer1, layer2, layer3].forEach(select => {
        select.addEventListener("change", handleLayerChange);
      });
    });

//Filter date
function filterByDate(data, minYear, maxYear) {
  return data.filter(d => {
    const year = parseInt(d.year);
    return year >= minYear && year <= maxYear;
  });
}

function updateStats(data) {
  document.getElementById("total_movies").textContent = data.length;
}

const layer1 = document.getElementById("layer1");
const layer2 = document.getElementById("layer2");
const layer3 = document.getElementById("layer3");

function isValidSelection(l1, l2, l3) {
  return l1 && l2 && l3 && new Set([l1, l2, l3]).size === 3;
}

function handleLayerChange() {
  const l1 = layer1.value;
  const l2 = layer2.value;
  const l3 = layer3.value;

  if (isValidSelection(l1, l2, l3)) {
    drawBubbleChart(dataset, l1, l2, l3);
  }
}


//Bubble

async function drawBubbleChart(data, layer1, layer2, layer3) {
  // Limit to top 100 films by gross for readability
  const sortedData = [...data].sort((a, b) => b.gross - a.gross).slice(0, 100);

  function getValue(d, key) {
    switch (key) {
      case "genre":
        return d.genre_grouped_main;
      case "budget":
        return d.budget_category
      case "language":
        return d.languages_main;
      default:
        return d[key];
    }
  }

//
  function nest(data, keys) {
    if (!keys.length) {
      return data.map(d => ({name: d.title, data: d}));
    }

    const [key, ...rest] = keys;
    const groups = d3.group(data, d => getValue(d, key));

    return Array.from(groups, ([k, v]) => ({
      name: k,
      children: nest(v, rest)
    }));
  }


  const nestedData = {
    name: "root",
    children: nest(sortedData, [layer1, layer2, layer3])
  };


  //
  function getFocusField(focus) {
    if (focus === "gross") return "gross_worldwide";
    if (focus === "awards") return "oscars";
    if (focus === "audience") return "rating";
    return "gross_worldwide"; // fallback
  }

  // Assign size (gross) at leaf level
  function assignValue(node, focus) {
    const focusField = getFocusField(focus);

    if (node.children) {
      node.children.forEach(child => assignValue(child, focus));

      if (focus === "audience") {
        // Mean
        const values = node.children.map(d => d.value || 0);
        node.value = values.length ? d3.mean(values) : 0;
      } else {
        // Sum
        node.value = d3.sum(node.children, d => d.value || 0);
      }
    } else {
      // Cas feuille : bien aller chercher dans node.data
      node.value = +node.data[focusField] || 1;
    }
  }

  assignValue(nestedData, focus);

  // Bubble chart dimensions
  const width = 1000;
  const height = 1000;

  const color = d3.scaleLinear()
      .domain([0, 5])
      .range(["hsl(50, 100%, 85%)", "hsl(45, 100%, 40%)"])
      .interpolate(d3.interpolateHcl)

  const pack = data => d3.pack()
      .size([width, height])
      .padding(3)
      (d3.hierarchy(data)
          .sum(d => d.value)
          .sort((a, b) => b.value - a.value));

  const root = pack(nestedData);
  let currentFocus = root;

  let view;

  d3.select("#bubble").html(""); // Clear previous chart
  const svg = d3.select("#bubble")
      .append("svg")
      .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr("width", width)
      .attr("height", height)
      .style("max-width", "100%")
      .style("height", "auto")
      .style("display", "block")
      .style("cursor", "pointer")
      .style("background", color(0));

  const node = svg.append("g")
      .selectAll("circle")
      .data(root.descendants().slice(1))
      .join("circle")
      .attr("fill", d => d.children ? color(d.depth) : "white")
      .attr("pointer-events", d => !d.children ? "none" : null)
      .on("mouseover", function () {
        d3.select(this).attr("stroke", "#000");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", null);
      })
      .on("click", (event, d) => {
        if (currentFocus !== d) {
          zoom(event, d);
          event.stopPropagation();
        }
      });


  const label = svg.append("g")
      .style("font", "10px sans-serif")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants())
      .join("text")
      .style("fill-opacity", d => d.parent === root ? 1 : 0)
      .style("display", d => d.parent === root ? "inline" : "none")
      .text(d => d.data.name);

  svg.on("click", (event) => zoom(event, root));
  zoomTo([root.x, root.y, root.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];
    view = v;
    label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k);
  }

  function zoom(event, d) {
    currentFocus = d;
    const transition = svg.transition()
        .duration(event.altKey ? 7500 : 750)
        .tween("zoom", _ => {
          const i = d3.interpolateZoom(view, [currentFocus.x, currentFocus.y, currentFocus.r * 2]);
          return t => zoomTo(i(t));
        });

    label
        .filter(function (d) {
          return d.parent === focus || this.style.display === "inline";
        })
        .transition(transition)
        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
        .on("start", function (d) {
          if (d.parent === focus) this.style.display = "inline";
        })
        .on("end", function (d) {
          if (d.parent !== focus) this.style.display = "none";
        });
  }
}


/*
function drawBubbleChart(data) {
  const width = 1000;
  const height = 1000;

  let topData;
    if (focus === "gross") {
      topData =  data
      .filter(d => !isNaN(d.gross_worldwide))
      .sort((a, b) => parseFloat(b.gross_worldwide) - parseFloat(a.gross_worldwide))
      .slice(0, 100);
    } else if (focus === "audience") {
      topData =  data
      .filter(d => !isNaN(d.rating))
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 100);
    } else if (focus === "awards") {
      topData =  data
      .filter(d => !isNaN(d.oscars))
      .sort((a, b) => parseFloat(b.oscars) - parseFloat(a.oscars))
      .slice(0, 100);
    }

  let category = document.getElementById("category-filter").value;

  if (category === "genre") {
    category = "genre_grouped_main";
  } else if (category === "languages") {
    category = "languages_main";
  } else if (category === "budget") {
    category = "budget_category";
  } else {
    category = "genre_grouped_main";
  }

  const categories = Array.from(new Set(data.map(d => d[category])));

  const container = d3.select("#bubble");
  container.selectAll("*").remove(); // Clear before redraw

  const svg = container.append("svg")
    .attr("width", width)
    .attr("height", height);

    const color = d3.scaleOrdinal()
    .domain(categories)
    .range([
      "#f5c518", "#e50914", "#0000ff", "#4caf50", "#ff6f61",
      "#8e44ad", "#00acc9", "#ff9800", "#795548","#800000",
      "#ec407a","#6c757d","#008080"
    ]);

    let domainValues;
    if (focus === "awards") {
      domainValues = [0, d3.max(data, d => +d.oscars || 0)];
    } else if (focus === "gross") {
      domainValues = d3.extent(data, d => +d.gross_worldwide || 0);
    } else if (focus === "audience") {
      domainValues = [0, 10];
    } else {
      domainValues = [0, 1];
    }

  const size = d3.scaleSqrt()
    .domain(domainValues)
    .range([5, 75]);

  const nodesGroup = svg.append("g");

  const nodes = nodesGroup.selectAll("g.node")
    .data(topData)
    .enter()
    .append("g")
    .attr("class", "node");

    nodes.append("circle")
    .attr("r", d => {
      if (focus === "gross") return size(+d.gross_worldwide || 0);
      if (focus === "audience") return size(+d.rating || 0);
      if (focus === "awards") return size(+d.oscars || 0);
      return size(5);
    })
    .attr("class", "node circle")
    .attr("fill", d => color(d[category]));


  nodes.append("text")
    .text(d => d.title.length > 20 ? d.title.slice(0, 17) + "…" : d.title)
    .attr("class","node text")
    .attr("dy", "0.35em")
    .style("pointer-events", "none");

  const simulation = d3.forceSimulation(topData)
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("charge", d3.forceManyBody().strength(5))
    .force("collision", d3.forceCollide(d => {
      if (focus === "gross") return size(+d.gross_worldwide || 0) + 2;
      if (focus === "awards") return size(+d.oscars || 0) + 2;
      if (focus === "audience") return size(+d.rating || 0) + 2;
      return size(5) + 2;
    }))
    .on("tick", () => {
      nodes.attr("transform", d => {
        const r = focus === "gross" ? size(+d.gross_worldwide || 0) :
                  focus === "awards" ? size(+d.oscars || 0) :
                  focus === "audience" ? size(+d.rating || 0) :
                  size(5);
        d.x = Math.max(r, Math.min(width - r, d.x));
        d.y = Math.max(r, Math.min(height - r, d.y));
        return `translate(${d.x},${d.y})`;
      });
    });

  nodes.call(d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }));

  // Legend
  const legend = svg.append("g").attr("transform", "translate(20,20)");

  categories.forEach((cat, i) => {
    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", i * 20)
      .attr("r", 6)
      .attr("fill", color(cat));

    legend.append("text")
      .attr("x", 12)
      .attr("y", i * 20 + 4)
      .text(cat)
      .style("font-size", "12px")
      .style("fill", "white")
      .style("alignment-baseline", "middle");
  });
}
*/

// Wait and search by movie title
function goToDetailsPage(movieTitle, retries = 10) {
    if (dataset.length === 0) {
        if (retries <= 0) {
            alert("Dataset could not be loaded.");
            return;
        }
        console.log("Waiting for dataset to load...");
        setTimeout(() => goToDetailsPage(movieTitle, retries - 1), 300);
        return;
    }


    const selectedMovie = dataset.find(
        m => m.title?.toLowerCase().trim() === movieTitle.toLowerCase().trim()
    );

    if (!selectedMovie) {
        alert(`Movie "${movieTitle}" not found in dataset.`);
        return;
    }

    console.log(movieTitle);

    localStorage.setItem('selectedMovie', JSON.stringify(selectedMovie));
    window.location.href = 'details.html';
}