const TIMELINE_PADDING = 20;
const HANDLE_WIDTH = 16;
const minYear = 1960;
const maxYear = 2025;

fetch('assets/components/timeline.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('timeline').innerHTML = html;
  })
  .then(initTimeline);

function initTimeline() {
  const slider = document.getElementById('timeline-slider');
  const leftHandle = document.getElementById('left-handle');
  const rightHandle = document.getElementById('right-handle');
  const rangeElements = [
    document.getElementById('range-bar'),
    document.getElementById('topcap'),
    document.getElementById('bottomcap')
  ];
  const leftTooltip = document.getElementById('left-tooltip');
  const rightTooltip = document.getElementById('right-tooltip');
  const markersContainer = document.getElementById('markers');

  const usableWidth = () => slider.offsetWidth - 2 * TIMELINE_PADDING ;

  const yearFromPosition = x => {
    const percent = (x - TIMELINE_PADDING) / usableWidth();
    return Math.round(minYear + percent * (maxYear - minYear));
  };

  const positionFromYear = year => {
    const percent = (year - minYear) / (maxYear - minYear);
    return TIMELINE_PADDING + percent * usableWidth();
  };

  function updateUI() {
    const leftX = parseFloat(leftHandle.style.left) || 0;
    const rightX = parseFloat(rightHandle.style.left) || 0;
    const width = Math.max(0, rightX - leftX);

  rangeElements.forEach(el => {
    el.style.left = `${leftX}px`;
    el.style.width = `${width}px`;
  });

  leftTooltip.textContent = yearFromPosition(leftX + HANDLE_WIDTH / 2);
  rightTooltip.textContent = yearFromPosition(rightX + HANDLE_WIDTH / 2);
}

function drag(handle) {
  function onMouseMove(e) {
    const rect = slider.getBoundingClientRect();
    let x = e.clientX - rect.left;

    const maxX = slider.offsetWidth - TIMELINE_PADDING / 2 - HANDLE_WIDTH;
    x = Math.max(TIMELINE_PADDING / 2, Math.min(maxX, x));

    const otherHandle = handle === leftHandle ? rightHandle : leftHandle;
    const otherX = parseFloat(otherHandle.style.left) || 0;

    if (handle === leftHandle) x = Math.min(x, otherX);
    else x = Math.max(x, otherX);

    handle.style.left = `${x}px`;
    updateUI();
  }

  function onMouseUp() {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    triggerUpdate();
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  }

  [leftHandle, rightHandle].forEach(handle => {
    handle.addEventListener('mousedown', () => {
    // Bring this handle to front
      leftHandle.style.zIndex = "1";
      rightHandle.style.zIndex = "1";
      handle.style.zIndex = "2"; // this one is on top

      drag(handle);
    });
  });

  function createMarkers() {
    markersContainer.innerHTML = '';
    for (let year = minYear; year <= maxYear; year += 5) {
      const marker = document.createElement('div');
      marker.classList.add('marker');

      const label = document.createElement('div');
      label.classList.add('marker-label');
      label.textContent = year;

      marker.appendChild(label);
      markersContainer.appendChild(marker);
    }
  }

  function positionHandlesFromYears() {
    leftHandle.style.left = `${positionFromYear(minYear)}px`;
    rightHandle.style.left = `${positionFromYear(maxYear)}px`;
    updateUI();
  }

  // Accessible globally for data filtering
  window.getSelectedYears = () => {
    const leftX = leftHandle.offsetLeft;
    const rightX = rightHandle.offsetLeft;
    const percentLeft = leftX / slider.offsetWidth;
    const percentRight = rightX / slider.offsetWidth;

    const startYear = Math.round(minYear + percentLeft * (maxYear - minYear));
    const endYear = Math.round(minYear + percentRight * (maxYear - minYear));

    return { startYear, endYear };
  };

function triggerUpdate() {
  const scrollY = window.scrollY;

  try {
    const filteredExplore = window.getExploreFilteredData?.();
    if (filteredExplore) {
      updateStats?.(filteredExplore);
      drawSankey?.(filteredExplore);
    }

    const filteredAnalysis = window.getAnalysisFilteredData?.();
    if (filteredAnalysis) {
      const l1 = layer1.value;
      const l2 = layer2.value;
      const l3 = layer3.value;

      if (isValidSelection(l1, l2, l3)) {
        drawBubbleChart(filteredAnalysis, l1, l2, l3);
      }
    }

  } catch (e) {
    console.error("Erreur dans triggerUpdate:", e);
  }

  window.scrollTo({ top: scrollY });
}



  // Init
  createMarkers();
  positionHandlesFromYears();
  window.addEventListener('resize', positionHandlesFromYears);
}