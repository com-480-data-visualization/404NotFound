// assets/js/story-charts.js
console.log('Chart:', Chart);
console.log('Chart.version:', Chart && Chart.version);
console.log('Chart.registerables:', Chart && Chart.registerables);
// 1) Register Chart components (Chart.js v3+)


document.addEventListener('DOMContentLoaded', () => {
    Papa.parse('assets/data/data_v2.csv', {
        header: true,
        download: true,
        complete: results => {
            console.log('Loaded rows:', results.data.length, results.data[0]);
            renderROIChart(results.data);
            renderRatingChart(results.data);
            renderAwardsChart(results.data);
        }
    });

    function renderROIChart(data) {
        const genreMap = {};
        data.forEach(r => {
            const gross = parseFloat(r.Gross) || 0;
            const budget = parseFloat(r.Budget) || 0;
            const roi = budget ? gross / budget : 0;
            (r.Genre || '').split('|').forEach(g => {
                if (!g) return;
                if (!genreMap[g]) genreMap[g] = {sum: 0, count: 0};
                genreMap[g].sum += roi;
                genreMap[g].count += 1;
            });
        });

        const labels = Object.keys(genreMap);
        const values = labels.map(g => +(genreMap[g].sum / genreMap[g].count).toFixed(2));

        new Chart(
            document.getElementById('chart-roi').getContext('2d'),
            {
                type: 'bar',
                data: {labels, datasets: [{label: 'Avg ROI', data: values}]},
                options: {
                    responsive: true,
                    scales: {y: {beginAtZero: true, title: {display: true, text: 'ROI'}}}
                }
            }
        );
    }

    function renderRatingChart(data) {
        const bins = Array(10).fill(0);
        data.forEach(r => {
            const v = parseFloat(r.imdbRating);
            if (!isNaN(v) && v >= 0) bins[Math.min(9, Math.floor(v))]++;
        });
        const labels = bins.map((_, i) => `${i}-${i + 1}`);

        new Chart(
            document.getElementById('chart-rating').getContext('2d'),
            {
                type: 'bar',
                data: {labels, datasets: [{label: 'Count', data: bins}]},
                options: {
                    responsive: true,
                    scales: {y: {beginAtZero: true, title: {display: true, text: 'Number of Films'}}}
                }
            }
        );
    }

    function renderAwardsChart(data) {
        const points = data.map(r => ({
            x: parseInt(r.AwardsWins) || 0,
            y: parseFloat(r.Gross) || 0
        }));

        new Chart(
            document.getElementById('chart-awards').getContext('2d'),
            {
                type: 'scatter',
                data: {datasets: [{label: 'Awards vs Gross', data: points}]},
                options: {
                    responsive: true,
                    scales: {
                        x: {beginAtZero: true, title: {display: true, text: 'Awards Won'}},
                        y: {beginAtZero: true, title: {display: true, text: 'Gross ($)'}}
                    }
                }
            }
        );
    }
});
