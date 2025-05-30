let dataset = [];
let selectedNode = null ;

// Chargement et initialisation
fetch('assets/data/data_v2.csv')
  .then(response => response.text())
  .then(text => {
    dataset = d3.csvParse(text);
    populateFilterOptions(dataset);

    // Wait until DOM and TomSelect are fully ready
    window.requestAnimationFrame(() => {
      const filtered = getExploreFilteredData();
      updateStats(filtered);
      drawSankey(filtered);
    });
  });

function populateFilterOptions(data) {
  const genreSet = new Set();
  const budgetSet = new Set();
  const languageSet = new Set();

  genreSet.add("All")
  budgetSet.add("All")
  languageSet.add("All")

  data.forEach(d => {
    if (d.genre_grouped_main) genreSet.add(d.genre_grouped_main);
    if (d.budget) budgetSet.add(d.budget_category);
    if (d.languages) languageSet.add(d.languages_main);
  });

  fillMultiSelect("genre-filter", genreSet);
  fillMultiSelect("budget-filter", budgetSet);
  fillMultiSelect("language-filter", languageSet);
}

function ensureAllOption(tom) {
  const allExists = tom.options['All'];

  if (!allExists) {
    tom.addOption({ value: 'All', text: 'All' });
  }

  // Sort options: All on top, then alphabetical
  const sortedOptions = Object.values(tom.options)
    .map(opt => opt.text)
    .filter(v => v !== 'All')
    .sort();

  sortedOptions.unshift('All');

  // Clear then re-add all options
  tom.clearOptions();
  sortedOptions.forEach(val => {
    tom.addOption({ value: val, text: val });
  });

  tom.refreshOptions(false);
}


const tomSelectInstances = {};

function fillMultiSelect(id, values) {
  const select = document.getElementById(id);
  select.innerHTML = "";

  // Put All at the top
  const sorted = Array.from(values).filter(v => v !== "All").sort();
  sorted.unshift("All");

  sorted.forEach(val => {
    const option = document.createElement("option");
    option.value = val;
    option.textContent = val;
    select.appendChild(option);
  });

  if (tomSelectInstances[id]) {
    tomSelectInstances[id].destroy();
  }

  const tom = new TomSelect(`#${id}`, {
    plugins: ['remove_button'],
    maxItems: null,
    placeholder: `Select ${id.replace("-filter", "")}…`,
    create: false,
    allowEmptyOption: true,
    onInitialize: function () {
      this.setValue(['All']);
    }
  });

  tomSelectInstances[id] = tom;

  // Flag to not doble updating
  let updating = false;
  
  tom.on('item_add', (value) => {
    if (updating) return;
    updating = true;

    if (value === 'All') {
      // Keep only "All"
      const others = tom.getValue().filter(v => v !== 'All');
      others.forEach(v => tom.removeItem(v, true));
      tom.setValue(['All'], true);
    } else {
      // Remove "All" if present and we add another option
      if (tom.getValue().includes('All')) {
        tom.removeItem('All', true);
      }

      // Recreate option "all" 
      tom.removeOption('All'); // Remove option "All"
      tom.addOption({ value: 'All', text: 'All' }); // Recreate 
      ensureAllOption(tom);
    }

    updating = false;
    updateStats(getExploreFilteredData());
    drawSankey(getExploreFilteredData());
  });

  tom.on('item_remove', (value) => {
    if (updating) return;
    updating = true;

    const current = tom.getValue();

    // If everything deleted, add "All"
    if (current.length === 0) {
      tom.setValue(['All'], true);
    }

    ensureAllOption(tom);

    updating = false;
    updateStats(getExploreFilteredData());
    drawSankey(getExploreFilteredData());
  });
}

function getSelectedValues(id) {
  const instance = tomSelectInstances[id];
  return instance ? instance.getValue() : ['All'];
}



function getExploreFilteredData() {
  if (!dataset.length) return [];

  const { startYear, endYear } = getSelectedYears();
  const selectedGenres = getSelectedValues("genre-filter");
  const selectedBudgets = getSelectedValues("budget-filter");
  const selectedLanguages = getSelectedValues("language-filter");

  return dataset.filter(d =>
    +d.year >= startYear &&
    +d.year <= endYear &&
    (selectedGenres.includes("All") || selectedGenres.includes(d.genre_grouped_main)) &&
    (selectedBudgets.includes("All") || selectedBudgets.includes(d.budget_category)) &&
    (selectedLanguages.includes("All") || selectedLanguages.includes(d.languages_main))

  );
}


function computeAverage(data, colName) {
  const validNumbers = data.map(d => parseFloat(d[colName])).filter(n => !isNaN(n));
  const total = validNumbers.reduce((sum, val) => sum + val, 0);
  return (total / validNumbers.length).toFixed(2);
}

function formatCurrency(val) {
  return Number(val).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}

function updateStats(data) {
  document.getElementById("average-gross").textContent = formatCurrency(computeAverage(data, "gross_worldwide"));
  document.getElementById("average-rating").textContent = computeAverage(data, "rating");
  document.getElementById("average-awards").textContent = computeAverage(data, "oscars");
  document.getElementById("total_movies").textContent = data.length;
}

function drawSankey(data) {
  const container = document.getElementById("sankey-container");
  container.innerHTML = "";

  const width = container.clientWidth;
  const height = Math.max(500, width * 0.65);
  const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
  const tooltip = d3.select("#tooltip");

  const links = [];
  const nodeSet = new Set();

  data.forEach(d => {
    const { gross_worldwide_category: gross, rating_category: rating, oscars: awards } = d;
    if (gross && rating && awards) {
      links.push({ source: gross, target: rating, value: 1 });
      links.push({ source: rating, target: awards, value: 1 });
      nodeSet.add(gross).add(rating).add(awards);
    }
  });

  const nodes = Array.from(nodeSet).map(name => ({ name }));
  const nodeMap = Object.fromEntries(nodes.map((n, i) => [n.name, i]));

  const sankeyLinks = Object.values(links.reduce((acc, { source, target, value }) => {
    const key = `${source}-${target}`;
    if (!acc[key]) {
      acc[key] = { source: nodeMap[source], target: nodeMap[target], value: 0 };
    }
    acc[key].value += value;
    return acc;
  }, {}));

  const sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(20)
    .extent([[1, 1], [width - 1, height - 6]]);

  const graph = sankey({ nodes: nodes.map(d => ({ ...d })), links: sankeyLinks });

  const nodePadding = sankey.nodePadding();
  const customGrossOrder = ["100M+", "50M - 100M", "10M - 50M", "5M - 10M", "1M - 5M", "500K - 1M", "100K - 500K", "0 - 100K"];

  [0, 1, 2].forEach(depth => {
    const columnNodes = graph.nodes.filter(n => n.depth === depth).sort((a, b) => {
      if (depth === 0) {
        return customGrossOrder.indexOf(a.name) - customGrossOrder.indexOf(b.name);
      }
      const aNum = parseFloat(a.name);
      const bNum = parseFloat(b.name);
      return (!isNaN(aNum) && !isNaN(bNum)) ? bNum - aNum : b.name.localeCompare(a.name);
    });

    let y = 0;
    columnNodes.forEach(node => {
      const height = node.y1 - node.y0;
      node.y0 = y;
      node.y1 = y + height;
      y += height + nodePadding;
    });
  });

  sankey.update(graph);

  // Links
  const linkGroup = svg.append("g").attr("class", "sankey-links");
  const linkPaths = linkGroup.selectAll("path")
    .data(graph.links)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("fill", "none")
    .on("mouseover", (event, d) => {
      tooltip
        .style("display", "block")
        .html(`<strong>${d.source.name} → ${d.target.name}</strong><br>${d.value} movie${d.value > 1 ? "s" : ""}`);
    })
    .on("mousemove", event => {
      tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY + 12}px`);
    })
    .on("mouseout", () => tooltip.style("display", "none"));

  // Nodes
  const nodeGroup = svg.append("g").attr("class", "sankey-nodes");
  const nodesG = nodeGroup.selectAll("g")
    .data(graph.nodes)
    .join("g")
    .call(d3.drag()
      .subject(d => d)
      .on("start", function () { d3.select(this).raise(); })
      .on("drag", function (event, d) {
        const dy = event.dy;
        d.y0 += dy;
        d.y1 += dy;
        d3.select(this).select("rect").attr("y", d.y0).attr("height", d.y1 - d.y0);
        d3.select(this).select("text").attr("y", (d.y0 + d.y1) / 2);
        sankey.update(graph);
        linkPaths.attr("d", d3.sankeyLinkHorizontal());
      })
    );

  nodesG.append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("class", "sankey-node");

  nodesG.append("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .attr("class", "sankey-label")
    .text(d => d.name);

  // Highlight links on node click
  nodesG.on("click", function (event, d) {
    const clickedNode = d.name;

   // Unselect node is already highlighted
    if (selectedNode === clickedNode) {
      selectedNode = null;

      const filtered = getExploreFilteredData();
      updateStats(filtered);

      //Unhighlight
      linkPaths.classed("highlighted", false);
    } else {
      selectedNode = clickedNode;

      const columnField = d.depth === 0
        ? "gross_worldwide_category"
        : d.depth === 1
        ? "rating_category"
        : "oscars";

      const filtered = getExploreFilteredData().filter(row => row[columnField] === d.name);
      updateStats(filtered);

      linkPaths.classed("highlighted", link =>
        link.source.name === d.name || link.target.name === d.name
      );
    }
  });


  // Column labels
  const columns = ["Gross", "IMDb Ratings", "Oscars"];
  const xPositions = [0, 1, 2].map(c => {
    const col = graph.nodes.filter(n => n.depth === c);
    return col.length ? (col[0].x0 + col[0].x1) / 2 : width / 2;
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

window.updateStats = updateStats;
window.drawSankey = drawSankey;
window.getExploreFilteredData = getExploreFilteredData;