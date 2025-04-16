// Load dataset
let dataset = [];

fetch('assets/data/data_v2.csv')
  .then(response => response.text())
  .then(text => {
    dataset = d3.csvParse(text);
    console.log(dataset); 
    updateStats(dataset);
  });

// Filter data by year range
function filterByDate(data, minYear, maxYear) {
  return data.filter(d => {
    const year = parseInt(d.year);
    return year >= minYear && year <= maxYear;
  });
}

// Compute average of a numeric column
function computeAverage(data, colName) {
  const numbers = data
    .map(d => parseFloat(d[colName]))
    .filter(num => !isNaN(num));
  const sum = numbers.reduce((a, b) => a + b, 0);
  return (sum / numbers.length).toFixed(2);
}

// Format numbers to USD currency
function formatCurrency(val) {
  return Number(val).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

// Update the HTML stats
function updateStats(data) {
  const minYear = 1960;
  const maxYear = 2025;
  const filtered = filterByDate(data, minYear, maxYear);

  const avgGross = computeAverage(filtered, "gross_worldwide");
  const avgRating = computeAverage(filtered, "rating");
  const avgAwards = computeAverage(filtered, "oscars");

  document.getElementById("average-gross").textContent = formatCurrency(avgGross);
  document.getElementById("average-rating").textContent = avgRating;
  document.getElementById("average-awards").textContent = avgAwards;
  document.getElementById("total_movies").textContent = filtered.length;
}

// Sankey diagram
d3.csv("assets/data/data_v2.csv").then(data => {
    const links = [];
    const nodeSet = new Set();

    data.forEach(d => {
      const gross = d.gross_worldwide_category;
      const rating = d.rating_category;
      const awards = d.oscars;

      if (gross && rating && awards) {
        links.push({ source: gross, target: rating, value: 1 });
        links.push({ source: rating, target: awards, value: 1 });

        nodeSet.add(gross);
        nodeSet.add(rating);
        nodeSet.add(awards);
      }
    });

    const nodes = Array.from(nodeSet).map(name => ({ name }));
    const nodeMap = Object.fromEntries(nodes.map((d, i) => [d.name, i]));

    const sankeyLinks = links.reduce((acc, cur) => {
      const key = `${cur.source}-${cur.target}`;
      if (!acc[key]) {
        acc[key] = { source: nodeMap[cur.source], target: nodeMap[cur.target], value: 0 };
      }
      acc[key].value += cur.value;
      return acc;
    }, {});

    drawSankey(Object.values(sankeyLinks), nodes);
});

function drawSankey(linksData, nodesData) {

    const container = document.getElementById("sankey-container");
    const width = container.clientWidth;
    const height = Math.max(500, container.clientWidth * 0.6);
    const svg = d3.select("#sankey-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

    // Sort the nodes
    let orderedNames = [];

    if (mode === "gross") {
      orderedNames = ["100M+", "50M - 100M", "10M - 50M", "5M - 10M", "1M - 5M", "500K - 1M", "100K - 500K", "0-100K"];
    } else if (mode === "ratings") {
      orderedNames = ["10.0", "9.0", "8.0", "7.0", "6.0", "5.0", "4.0", "3.0", "2.0", "1.0", "0.0"];
    } else if (mode === "awards") {
      orderedNames = ["11", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "0"];
    }
    
    const yOrderMap = {};
    orderedNames.forEach((name, i) => {
      yOrderMap[name] = i;
    });

  
    const nodesSorted = [...nodesData];
    nodesSorted.sort((a, b) => {
      if (a.column !== b.column) return a.column - b.column;
      return (yOrderMap[a.name] ?? 999) - (yOrderMap[b.name] ?? 999);
    });

    const sankey = d3.sankey()
      .nodeWidth(20)
      .nodePadding(20)
      .extent([[1, 1], [width - 1, height - 6]]);
  
    const graph = sankey({
      nodes: nodesSorted.map(d => Object.assign({}, d)),
      links: linksData.map(d => Object.assign({}, d))
    });
  
    // Draw links
    svg.append("g")
      .attr("class", "sankey-links")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("fill", "none");

  
    // Draw nodes
    const node = svg.append("g")
      .attr("class", "sankey-nodes")
      .selectAll("g")
      .data(graph.nodes)
      .join("g");
  
    node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("class", "sankey-node");
  
      node.append("text")
      .attr("x", d => d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("class", "sankey-label")
      .text(d => d.name)
      .filter(d => d.x0 < width / 2)
      .attr("x", d => d.x1 + 6)
      .attr("text-anchor", "start");

      const columns = ["Gross", "IMDb Ratings", "Oscars"];
      const xPositions = [0, 1, 2].map(c => {
        const nodesInCol = graph.nodes.filter(n => n.column === c);
        const xMid = nodesInCol.length
          ? (nodesInCol[0].x0 + nodesInCol[0].x1) / 2
          : width / 2;
        return xMid;
      });
    
      svg.append("g")
        .attr("class", "sankey-column-labels")
        .selectAll("text")
        .data(columns)
        .join("text")
        .attr("x", (d, i) => xPositions[i])
        .attr("y", height - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text(d => d);
  }



