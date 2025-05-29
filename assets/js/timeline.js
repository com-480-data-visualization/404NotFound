const TIMELINE_PADDING = 20;
const HANDLE_WIDTH = 16;
const minYear = 1960;
const maxYear = 2025;

fetch('assets/components/timeline.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('timeline').innerHTML = html;
  })
  .then(() => {
    initTimeline();
  });

function initTimeline() {
  const slider = document.getElementById('timeline-slider');
  const leftHandle = document.getElementById('left-handle');
  const rightHandle = document.getElementById('right-handle');
  const rangeBar = document.getElementById('range-bar');
  const topcap = document.getElementById('topcap');
  const bottomcap = document.getElementById('bottomcap');
  const leftTooltip = document.getElementById('left-tooltip');
  const rightTooltip = document.getElementById('right-tooltip');
  const markersContainer = document.getElementById('markers');

  function yearFromPosition(x) {
    const usableWidth = slider.offsetWidth - 2 * TIMELINE_PADDING;
    const percent = (x - TIMELINE_PADDING) / usableWidth;
    return Math.round(minYear + percent * (maxYear - minYear));
  }

  function positionFromYear(year) {
    const usableWidth = slider.offsetWidth - 2*TIMELINE_PADDING;
    const percent = (year - minYear) / (maxYear - minYear);
    return TIMELINE_PADDING + percent * usableWidth;
  }

  function updateUI() {
    const leftX = leftHandle.offsetLeft;
    const rightX = rightHandle.offsetLeft;

    const width = Math.max(0, rightX - leftX);

    rangeBar.style.left = `${leftX}px`;
    rangeBar.style.width = `${width}px`;

    topcap.style.left = `${leftX}px`;
    topcap.style.width = `${width}px`;

    bottomcap.style.left = `${leftX}px`;
    bottomcap.style.width = `${width}px`;

    const leftYear = yearFromPosition(leftX + HANDLE_WIDTH / 2);
    const rightYear = yearFromPosition(rightX + HANDLE_WIDTH / 2);

    leftTooltip.textContent = leftYear;
    rightTooltip.textContent = rightYear;
  }

  function drag(handle) {
    let dragging = true;

    function onMouseMove(e) {
      const rect = slider.getBoundingClientRect();
      let x = e.clientX - rect.left;

      x = Math.max(TIMELINE_PADDING/2, Math.min(slider.offsetWidth - TIMELINE_PADDING/2 - HANDLE_WIDTH, x));

      const otherHandle = handle === leftHandle ? rightHandle : leftHandle;
      const otherX = otherHandle.offsetLeft;

      if (handle === leftHandle) {
        x = Math.min(x, otherX); 
      } else {
        x = Math.max(x, otherX); 
      }

      handle.style.left = `${x}px`;
      updateUI();
    }

    function onMouseUp() {
      dragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  [leftHandle, rightHandle].forEach(handle => {
    handle.addEventListener('mousedown', () => drag(handle));
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
    const leftX = positionFromYear(minYear);
    const rightX = positionFromYear(maxYear);
    leftHandle.style.left = `${leftX}px`;
    rightHandle.style.left = `${rightX}px`;
    updateUI();
  }

  createMarkers();
  positionHandlesFromYears();

  window.addEventListener('resize', () => {
    positionHandlesFromYears();
  });

   window.getSelectedYears = function () {
    const leftX = document.getElementById('left-handle').offsetLeft;
    const rightX = document.getElementById('right-handle').offsetLeft;
    const slider = document.getElementById('timeline-slider');

    const minYear = 1960;
    const maxYear = 2025;

    const percentLeft = leftX / slider.offsetWidth;
    const percentRight = rightX / slider.offsetWidth;

    const startYear = Math.round(minYear + percentLeft * (maxYear - minYear));
    const endYear = Math.round(minYear + percentRight * (maxYear - minYear));

    return { startYear, endYear };
  };
}
