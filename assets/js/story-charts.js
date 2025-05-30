document.addEventListener('DOMContentLoaded', () => {
    let chartData = null;
    let chartsDrawn = {
        'section-financial': false,
        'section-critical': false,
        'section-recognition': false
    };

    // Optional: Show loading message on each chart initially
    function showLoading(id) {
        const ctx = document.getElementById(id);
        if (ctx) {
            const parent = ctx.parentElement;
            if (parent && !parent.querySelector('.loading-msg')) {
                const msg = document.createElement('div');
                msg.className = 'loading-msg';
                msg.style.cssText = 'color:#aaa;text-align:center;position:absolute;width:100%;top:40%;left:0;';
                msg.innerText = 'Loading...';
                parent.style.position = 'relative';
                parent.appendChild(msg);
            }
        }
    }
    showLoading('chart-roi');
    showLoading('chart-rating');
    showLoading('chart-awards');

    Papa.parse('assets/data/data_v2.csv', {
        header: true,
        download: true,
        complete: results => {
            chartData = results.data;
        }
    });

    // Observer: draw chart only when section is visible and data is ready
    const sectionConfig = [
        {
            id: 'section-financial',
            chartId: 'chart-roi',
            renderFn: renderROIChart
        },
        {
            id: 'section-critical',
            chartId: 'chart-rating',
            renderFn: renderRatingChart
        },
        {
            id: 'section-recognition',
            chartId: 'chart-awards',
            renderFn: renderAwardsChart
        }
    ];

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && chartData) {
                const sec = sectionConfig.find(s => s.id === entry.target.id);
                if (sec && !chartsDrawn[sec.id]) {
                    // Remove loading message
                    const canvas = document.getElementById(sec.chartId);
                    if (canvas && canvas.parentElement) {
                        const loading = canvas.parentElement.querySelector('.loading-msg');
                        if (loading) loading.remove();
                    }
                    sec.renderFn(chartData);
                    chartsDrawn[sec.id] = true;
                }
            }
        });
    }, {threshold: 0.4});

    sectionConfig.forEach(sec => {
        const elem = document.getElementById(sec.id);
        if (elem) observer.observe(elem);
    });

    // ---- Chart renderers ----

    function renderROIChart(data) {
        const genreMap = {};
        data.forEach(r => {
            const roi = parseFloat(r.ROI) || 0;
            (r.genres || '').split(',').forEach(g => {
                g = g.trim();
                if (!g) return;
                if (!genreMap[g]) genreMap[g] = {sum: 0, count: 0};
                genreMap[g].sum += roi;
                genreMap[g].count += 1;
            });
        });
        const labels = Object.keys(genreMap);
        const values = labels.map(g => +(genreMap[g].sum / genreMap[g].count).toFixed(2));

        const ctx = document.getElementById('chart-roi').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {labels, datasets: [{label: 'Avg ROI', data: values}]},
            options: {
                responsive: true,
                scales: {y: {beginAtZero: true, title: {display: true, text: 'ROI'}}}
            }
        });
    }


    function renderRatingChart(data) {
        const bins = Array(10).fill(0);
        data.forEach(r => {
            const v = parseFloat(r.rating);
            if (!isNaN(v) && v >= 0) bins[Math.min(9, Math.floor(v))]++;
        });
        const labels = bins.map((_, i) => `${i}-${i + 1}`);

        const ctx = document.getElementById('chart-rating').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {labels, datasets: [{label: 'Count', data: bins}]},
            options: {
                responsive: true,
                scales: {y: {beginAtZero: true, title: {display: true, text: 'Number of Films'}}}
            }
        });
    }


    function renderAwardsChart(data) {
        const points = data.map(r => ({
            x: parseInt(r.wins) || 0,
            y: parseFloat(r.gross_worldwide) || 0
        }));

        const ctx = document.getElementById('chart-awards').getContext('2d');
        new Chart(ctx, {
            type: 'scatter',
            data: {datasets: [{label: 'Awards vs Gross', data: points}]},
            options: {
                responsive: true,
                scales: {
                    x: {beginAtZero: true, title: {display: true, text: 'Awards Won'}},
                    y: {beginAtZero: true, title: {display: true, text: 'Gross ($)'}}
                }
            }
        });
    }

});
