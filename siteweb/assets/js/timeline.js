function applyFilter() {
    const startYear = parseInt(document.getElementById('start-year').value);
    const endYear = parseInt(document.getElementById('end-year').value);
  
    // Validate that the year range is correct
    if (startYear < 1920 || endYear > 2025 || startYear > endYear) {
      alert("Invalid year range");
      return;
    }
  }
  
fetch('assets/components/timeline.html')
  .then(res => res.text())
  .then(data => {
    document.getElementById('timeline').innerHTML = data;
  });

