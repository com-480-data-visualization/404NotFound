// Load dataset
let dataset = [];

fetch('assets/data/data_v2.csv')
  .then(response => response.text())
  .then(text => {
    dataset = d3.csvParse(text);
    console.log(dataset);
    updateStats(dataset);
    drawSankey(dataset); 
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

// Sankey diagram (Single Sankey)
function drawSankey(data) {
  const container = document.getElementById("sankey-container");
  const width = container.clientWidth;
  const height = Math.max(500, container.clientWidth * 0.65);
  const svg = d3.select("#sankey-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  // Create a list of all the links and nodes
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

  const sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(20)
    .extent([[1, 1], [width - 1, height - 6]]);

  const graph = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: Object.values(sankeyLinks)
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
  .join("g")
  .call(d3.drag()
    .subject(d => d)
    .on("start", function (event, d) {
      d3.select(this).raise();
    })
    .on("drag", function (event, d) {
      const dy = event.dy;
      d.y0 += dy;
      d.y1 += dy;
      d3.select(this).select("rect")
        .attr("y", d.y0)
        .attr("height", d.y1 - d.y0);

      d3.select(this).select("text")
        .attr("y", (d.y0 + d.y1) / 2);

      sankey.update(graph); 
      svg.selectAll(".sankey-links path")
        .attr("d", d3.sankeyLinkHorizontal());
    })
  );

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

  node.on("click", function(event, d) {
      svg.selectAll(".sankey-links path")
        .classed("highlighted", false);
    
      svg.selectAll(".sankey-links path")
        .filter(link =>
          link.source.name === d.name || link.target.name === d.name
        )
        .classed("highlighted", true);
    });


  // Add column labels
  const columns = ["Gross", "IMDb Ratings", "Oscars"];
  const xPositions = [0, 1, 2].map(c => {
    const nodesInCol = graph.nodes.filter(n => n.depth === c);
    const xMid = nodesInCol.length
      ? (nodesInCol[0].x0 + nodesInCol[0].x1) / 2
      : width / 2;
    return xMid;
  });

  svg.append("g")
    .selectAll("text")
    .data(columns)
    .join("text")
    .attr("class", "sankey-column-labels")
    .attr("x", (d, i) => xPositions[i])
    .attr("y", height + 30)
    .attr("text-anchor", "middle")
    .text(d => d);
}
