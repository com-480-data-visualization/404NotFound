// ——————————————————————————————————————————————————————————————
// 0. grab your new focus <select> plus your existing layer <select>s
// ——————————————————————————————————————————————————————————————
const focusSelect = document.getElementById('focus');
const layer1      = document.getElementById('layer1');
const layer2      = document.getElementById('layer2');
const layer3      = document.getElementById('layer3');

let leftTooltip
let rightTooltip

const originalInit = window.initTimeline;


// replace your handleChange with a debounced version of doUpdate:
const debouncedUpdate = debounce(doUpdate, 50);

window.initTimeline = function() {
    // 1) call the real timeline setup
    originalInit();
    leftTooltip = document.getElementById('left-tooltip');
    rightTooltip = document.getElementById('right-tooltip');

    // 2. make a MutationObserver whose callback fires whenever the text node changes
    const observer = new MutationObserver((mutations) => {
        for (let m of mutations) {
            // childList mutations will fire when textContent is reassigned
            if (m.type === 'childList') {
                debouncedUpdate()
            }
        }
    });

    // 3. start observing: watch for added or removed child nodes (i.e. the text node)
    observer.observe(leftTooltip, {
        childList: true,
    });

    observer.observe(rightTooltip, {
        childList: true,
    })
};


// allow focus to be mutable
let focus = focusSelect.value;

// display-name map for focus
const focusDisplayNames = {
    gross:    "Box office revenue",
    awards:   "Awards success",
    audience: "IMDb Ratings",
};

// ——————————————————————————————————————————————————————————————
// 1. helper to update the two DOM nodes showing current focus
// ——————————————————————————————————————————————————————————————
function updateFocusDisplay() {
    // update the big “Feature” title
    document.getElementById("Feature").textContent = capitalize(focus);
    // update the small descriptive phrase
    document.getElementById("focus-word").textContent = focusDisplayNames[focus] || '';
}

// ——————————————————————————————————————————————————————————————
// 2. whenever the user changes the focus <select>…
// ——————————————————————————————————————————————————————————————
focusSelect.addEventListener('change', debouncedUpdate);

// ——————————————————————————————————————————————————————————————
// 3. on initial load, also call updateFocusDisplay()
// ——————————————————————————————————————————————————————————————
updateFocusDisplay();

// Capitalize the first letter of a word
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const displayFocus = focusDisplayNames[focus]

// Update the HTML content on the page with the dynamic focus name
document.getElementById("Feature").textContent = capitalize(focus);
document.getElementById("focus-word").textContent = displayFocus;


let rawDataset = [];
let dataset = [];


fetch('assets/data/data_v2.csv')
    .then(response => response.text())
    .then(text => {

      const defaultL1 = "genre";
      const defaultL2 = "budget";
      const defaultL3 = "language";

      rawDataset = d3.csvParse(text);
      dataset = filterByDate(rawDataset, minYear, maxYear);

      if (isValidSelection(defaultL1, defaultL2, defaultL3)) {
        layer1.value = defaultL1;
        layer2.value = defaultL2;
        layer3.value = defaultL3;
        drawBubbleChart(dataset, defaultL1, defaultL2, defaultL3);
      }

      // Attacher les listeners
      [layer1, layer2, layer3].forEach(select => {
        select.addEventListener("change", debouncedUpdate);
      });
    });



//Filter date
function filterByDate(data, minYear, maxYear) {
  return data.filter(d => {
    const year = parseInt(d.year);
    return year >= minYear && year <= maxYear;
  });
}


function isValidSelection(l1, l2, l3) {
  return l1 && l2 && l3 && new Set([l1, l2, l3]).size === 3;
}



let bubbleCount = 0;
//Bubble
async function drawBubbleChart(data, layer1, layer2, layer3) {


    bubbleCount++;
    console.log("count", bubbleCount)
    // ─── 1. Build & value the hierarchy ────────────────────────────────
    const sortedData = [...data]
        .sort((a, b) => (+b.gross) - (+a.gross))
        .slice(0, 100);

    function getValue(d, key) {
        switch (key) {
            case "genre":    return d.genre_grouped_main;
            case "budget":   return d.budget_category;
            case "language": return d.languages_main;
            default:         return d[key];
        }
    }

    function nest(records, keys) {
        if (!keys.length) {
            return records.map(r => ({ name: r.title, data: r }));
        }
        const [k, ...rest] = keys;
        const groups = d3.group(records, r => getValue(r, k));
        return Array.from(groups, ([val, recs]) => ({
            name: val,
            children: nest(recs, rest)
        }));
    }

    const nestedData = {
        name: "root",
        children: nest(sortedData, [layer1, layer2, layer3])
    };

    function getFocusField(f) {
        if (focus === "gross")    return "gross_worldwide";
        if (focus === "awards")   return "oscars";
        if (focus === "audience") return "rating";
        return "gross_worldwide";
    }

    function assignValue(node) {
        const field = getFocusField(focus);
        if (node.children) {
            node.children.forEach(assignValue);
            node.value = (focus === "audience")
                ? d3.mean(node.children, c => c.value || 0)
                : d3.sum(node.children,  c => c.value || 0);
        } else {
            node.value = +(node.data[field] || 0) || 1;
        }
    }
    assignValue(nestedData);

    // ─── 2. Layout & scales ─────────────────────────────────────────────
    const width  = 1000, height = 1000;
    const color = d3.scaleLinear()
        .domain([0, 5])
        .range(["hsl(50,100%,85%)","hsl(45,100%,40%)"])
        .interpolate(d3.interpolateHcl);

    const pack = d3.pack()
        .size([width, height])
        .padding(3);

    const root = pack(
        d3.hierarchy(nestedData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value)
    );
    let currentFocus = root, view;

    // ─── 3. Prepare SVG ─────────────────────────────────────────────────
    d3.select("#bubble").html("");
    const svg = d3.select("#bubble")
        .append("svg")
        .attr("viewBox", `-${width/2} -${height/2} ${width} ${height}`)
        .attr("width", width)
        .attr("height", height)
        .style("max-width","100%").style("height","auto")
        .style("cursor","pointer").style("background", color(0));

    // ─── 4. Draw initial bubbles (white for leaves) ─────────────────
    const node = svg.append("g")
        .selectAll("circle")
        .data(root.descendants().slice(1))
        .join("circle")
        .attr("r", d => d.r)
        .attr("fill", d => d.children ? color(d.depth) : "white")
        .attr("pointer-events","all")
        .style("cursor","pointer")
        .on("mouseover", function() { d3.select(this).attr("stroke","#000"); })
        .on("mouseout",  function() { d3.select(this).attr("stroke",null); })
        .on("click", (event, d) => {
            if (d.children) {
                zoom(event, d);
                event.stopPropagation();
            } else {
                goToDetailsPage(d.data.data.title);
            }
        });

    // ─── 5. Create patterns & then update leaf fills ────────────────
    const defs   = svg.append("defs");
    const leaves = root.leaves();

    for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        const { title, year } = leaf.data.data;
        const pid = `poster-${i}`;

        const posterUrl = await getPosterUrl(title, year);
        const ratio = 444 / 300
        const offset = (ratio-1.0)/2.0

        defs.append("pattern")
            .attr("id", pid)
            .attr("patternUnits", "objectBoundingBox")
            .attr("patternContentUnits", "objectBoundingBox")
            .attr("width", 1)
            .attr("height", 1)
            .append("image")
            .attr("href", posterUrl)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("width",   ratio)        // zoom
            .attr("height",  ratio)        // zoom
            .attr("x",      -offset)       // center horizontally
            .attr("y",      -offset);      // center vertically

        leaf.patternId = pid;
    }

    // Replace each leaf’s white fill with its poster pattern
    node.filter(d => !d.children)
        .transition()
        .duration(500)
        .attr("fill", d => `url(#${d.patternId})`);

    // ─── 6. Labels ────────────────────────────────────────────────────
    const label = svg.append("g")
        .style("font","10px sans-serif")
        .attr("pointer-events","none")
        .attr("text-anchor","middle")
        .selectAll("text")
        .data(root.descendants())
        .join("text")
        .style("fill-opacity", d => d.parent === root ? 1 : 0)
        .style("display",     d => d.parent === root ? "inline" : "none")
        .text(d => d.data.name);

    // ─── 7. Zoom setup ────────────────────────────────────────────────
    svg.on("click", event => zoom(event, root));
    zoomTo([root.x, root.y, root.r * 2]);

    function zoomTo(v) {
        const k = width / v[2]; view = v;
        label.attr("transform", d =>
            `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
        );
        node.attr("transform", d =>
            `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
        ).attr("r", d => d.r * k);
    }

    function zoom(event, d) {
        currentFocus = d;
        const t = svg.transition()
            .duration(event.altKey ? 7500 : 750)
            .tween("zoom", () => {
                const i = d3.interpolateZoom(view, [d.x, d.y, d.r * 2]);
                return t => zoomTo(i(t));
            });

        label.filter(function(d) {
            // here `this` is the <text> element, so this.style.display works
            return d.parent === currentFocus
                || this.style.display === "inline";
        })
            .transition(t)
            .style("fill-opacity", d => d.parent === currentFocus ? 1 : 0)
            .on("start", function(d) {
                if (d.parent === currentFocus) this.style.display = "inline";
            })
            .on("end", function(d) {
                if (d.parent !== currentFocus) this.style.display = "none";
            });
    }
}



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

    localStorage.setItem('selectedMovie', JSON.stringify(selectedMovie));
    window.location.href = 'details.html';
}


// wrap your heavy draw in a debounced function
function doUpdate() {
    focus = focusSelect.value;           // 2.a update our “focus” variable
    updateFocusDisplay();                // 2.b refresh the labels on the page

    const l1 = layer1.value;
    const l2 = layer2.value;
    const l3 = layer3.value;

    dataset = filterByDate(rawDataset, leftTooltip.textContent, rightTooltip.textContent);

    if (isValidSelection(l1, l2, l3)) {
        drawBubbleChart(dataset, l1, l2, l3);
    }
}

// simple debounce helper
function debounce(fn, delay) {
    let id;
    return (...args) => {
        clearTimeout(id);
        id = setTimeout(() => fn(...args), delay);
    };
}

