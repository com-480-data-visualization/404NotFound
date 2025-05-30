document.addEventListener('DOMContentLoaded', () => {
    let chartData = null;
    let chartsDrawn = {
        'section-financial': false,
        'section-critical': false,
        'section-recognition': false
    };


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
    showLoading('chart-popularGenres');
    showLoading('chart-rating');
    showLoading('chart-awards');

    Papa.parse('assets/data/data_v2.csv', {
        header: true,
        download: true,
        complete: results => {
            chartData = results.data;
        }
    });


    const sectionConfig = [
        {
            id: 'section-financial',
            chartId: 'chart-roi',
            renderFn: renderROIChart
        },
        {
            id: 'section-mostPopular',
            chartId: 'chart-popularGenres',
            renderFn: renderPopularGenresChart
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
            const roi = parseFloat(r.ROI);


            if (isNaN(roi)) {
                return;
            }

            let genresString = r.genre_grouped;

            if (!genresString || typeof genresString !== 'string') {
                console.warn("renderROIChart: Missing or invalid genresString for row:", r);
                return;
            }

            try {
                const individualGenres = genresString
                    .slice(1, -1)
                    .split(',')
                    .map(g => g.trim().replace(/['"]/g, ''));

                individualGenres.forEach(genre => {
                    if (!genre) return;

                    if (!genreMap[genre]) {
                        genreMap[genre] = { sum: 0, count: 0 };
                    }
                    genreMap[genre].sum += roi;
                    genreMap[genre].count += 1;
                });
            } catch (e) {
                console.error("renderROIChart: Error parsing genres: ", genresString, "for row:", r, e);
                return;
            }
        });

        const entries = Object.entries(genreMap)
            .map(([genre, obj]) => ({
                genre,
                avgRoi: obj.count > 0 ? obj.sum / obj.count : 0
            }))
            .sort((a, b) => b.avgRoi - a.avgRoi);

        const labels = entries.map(item => item.genre);
        const values = entries.map(item => +item.avgRoi.toFixed(2));


        const baseColorROI = { r: 245, g: 197, b: 24 }; // Standard IMDB Yellow
        const darkFactorROI = 0.4;

        const backgroundColorsROI = labels.map((_, i) => {

            const t = (labels.length - 1 - i) / Math.max(1, labels.length - 1);

            const r = Math.round(baseColorROI.r * (darkFactorROI + (1 - darkFactorROI) * t) );
            const g = Math.round(baseColorROI.g * (darkFactorROI + (1 - darkFactorROI) * t) );
            const b = Math.round(baseColorROI.b * (darkFactorROI + (1 - darkFactorROI) * t) );
            return `rgba(${r}, ${g}, ${b}, 1)`;
        });

        const hoverBackgroundColorsROI = backgroundColorsROI.map(color => {
            const [r, g, b] = color.match(/\d+/g).map(Number);
            // Make hover slightly lighter and less opaque
            return `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 15)}, ${Math.min(255, b + 10)}, 0.85)`;
        });


        new Chart(
            document.getElementById('chart-roi').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Average ROI',
                        data: values,
                        backgroundColor: backgroundColorsROI,
                        borderColor: backgroundColorsROI,
                        borderWidth: 1,
                        hoverBackgroundColor: hoverBackgroundColorsROI,
                        hoverBorderColor: hoverBackgroundColorsROI
                    }]
                },
                options: {
                    devicePixelRatio: window.devicePixelRatio || 1,
                    indexAxis: 'y',
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Average ROI by Genre'
                        }
                    },
                    scales: {
                        x: {
                            min: 0,
                            beginAtZero: true,
                            title: { display: true, text: 'Average ROI' },

                        },
                        y: {
                            title: { display: true, text: 'Genre' }
                        }
                    }
                }
            }
        );
    }

    function renderPopularGenresChart(data) {
        const genreCounts = {};

        data.forEach(r => {
            let genresString = r.genre_grouped;

            if (!genresString || typeof genresString !== 'string') {
                console.warn("renderPopularGenresChart: Missing or invalid genresString for row:", r);
                return;
            }

            try {
                const individualGenres = genresString
                    .slice(1, -1)
                    .split(',')
                    .map(g => g.trim().replace(/['"]/g, ''));

                individualGenres.forEach(genre => {
                    if (!genre) return;
                    if (!genreCounts[genre]) {
                        genreCounts[genre] = 0;
                    }
                    genreCounts[genre]++;
                });
            } catch (e) {
                console.error("renderPopularGenresChart: Error parsing genres: ", genresString, "for row:", r, e);
                return;
            }
        });

        const entries = Object.entries(genreCounts)
            .map(([genre, count]) => ({ genre, count }))
            .sort((a, b) => b.count - a.count); // Sort by count descending

        const labels = entries.map(item => item.genre);
        const values = entries.map(item => item.count);

        const baseColor = { r: 245, g: 197, b: 24 };
        const darkFactor = 0.5;

        const backgroundColors = labels.map((_, i) => {
            const t = (labels.length - 1 - i) / Math.max(1, labels.length - 1);
            const r = Math.round(baseColor.r * (darkFactor + (1 - darkFactor) * t) );
            const g = Math.round(baseColor.g * (darkFactor + (1 - darkFactor) * t) );
            const b = Math.round(baseColor.b * (darkFactor + (1 - darkFactor) * t) );
            return `rgba(${r}, ${g}, ${b}, 1)`;
        });

        const hoverBackgroundColors = backgroundColors.map(color => {
            const [r, g, b] = color.match(/\d+/g).map(Number);
            return `rgba(${Math.min(255, r + 20)}, ${Math.min(255, g + 15)}, ${Math.min(255, b + 10)}, 0.85)`;
        });


        new Chart(
            document.getElementById('chart-popularGenres').getContext('2d'),
            {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Number of Movies',
                        data: values,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors,
                        borderWidth: 1,
                        hoverBackgroundColor: hoverBackgroundColors,
                        hoverBorderColor: hoverBackgroundColors
                    }]
                },
                options: {
                    devicePixelRatio: window.devicePixelRatio || 1,
                    indexAxis: 'y',
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Most Popular Genres'
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: { display: true, text: 'Number of Movies' }
                        },
                        y: {
                            title: { display: true, text: 'Genre' }
                        }
                    }
                }
            }
        );
    }






    function renderRatingChart(data) {
        const bins = Array(10).fill(0);
        data.forEach(r => {
            const ratingValue = parseFloat(r.rating);
            if (!isNaN(ratingValue) && ratingValue >= 0) {

                const binIndex = Math.min(9, Math.floor(ratingValue));
                bins[binIndex]++;
            }
        });


        const labels = bins.map((_, i) => {
            if (i === 9) {
                return `${i}-10`;
            }
            return `${i}-${i + 1}`;
        });

        const ctx = document.getElementById('chart-rating').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Count',
                    data: bins,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;

                        if (!chartArea) {

                            return 'rgba(245, 197, 24, 1)';
                        }

                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom); // For vertical bars

                         gradient.addColorStop(0, 'rgba(245, 197, 24, 1)');
                         gradient.addColorStop(1, 'rgba(215, 165, 0, 1)');
                        return gradient;
                    },
                    borderColor: 'rgba(180, 130, 0, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {

                devicePixelRatio: window.devicePixelRatio || 1,
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Distribution of Movie Ratings'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,

                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Rating Range (0-10)'
                        }
                    }
                }
            }
        });
    }



    function renderAwardsChart(data) {
        if (!data || data.length === 0) {
            console.error("renderAwardsChart: No data provided or data is empty.");
            const canvas = document.getElementById('chart-awards');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = "16px Inter, sans-serif";
                ctx.fillStyle = "#ccc";
                ctx.textAlign = "center";
                ctx.fillText("No data available to display for Awards vs Gross chart.", canvas.width / 2, canvas.height / 2);
            }
            return;
        }


        let minBudgetLog = Infinity;
        let maxBudgetLog = -Infinity;

        const positiveBudgets = data.map(r => parseFloat(r.budget)).filter(b => !isNaN(b) && b > 0);

        if (positiveBudgets.length > 0) {

            const logBudgets = positiveBudgets.map(b => Math.log10(b));
            logBudgets.sort((a, b) => a - b);


            let p5Log = logBudgets[Math.floor(logBudgets.length * 0.05)];
            let p95Log = logBudgets[Math.floor(logBudgets.length * 0.95)];
            const absoluteMinLog = logBudgets[0];
            const absoluteMaxLog = logBudgets[logBudgets.length - 1];


            p5Log = isNaN(p5Log) ? absoluteMinLog : p5Log;
            p95Log = isNaN(p95Log) ? absoluteMaxLog : p95Log;



            if ( (p95Log - p5Log < 0.1 && absoluteMaxLog > absoluteMinLog) ||
                p5Log >= p95Log ||
                logBudgets.length < 20
            ) {
                minBudgetLog = absoluteMinLog;
                maxBudgetLog = absoluteMaxLog;
            } else {
                minBudgetLog = p5Log;
                maxBudgetLog = p95Log;
            }


            if (minBudgetLog === maxBudgetLog) {
                if (minBudgetLog === Infinity || isNaN(minBudgetLog)) {
                    minBudgetLog = Math.log10(1);
                    maxBudgetLog = Math.log10(1000000);
                } else {
                    minBudgetLog = minBudgetLog - 0.5;
                    maxBudgetLog = maxBudgetLog + 0.5;
                }
            }
        } else {
            minBudgetLog = Math.log10(1);
            maxBudgetLog = Math.log10(1000000);
        }


        if (minBudgetLog === Infinity || isNaN(minBudgetLog)) minBudgetLog = 0;
        if (maxBudgetLog === -Infinity || isNaN(maxBudgetLog) || maxBudgetLog <= minBudgetLog) maxBudgetLog = minBudgetLog + 1;


        console.log("LOG Budget range for color scale (minBudgetLog, maxBudgetLog):", minBudgetLog, maxBudgetLog);

        const points = data.map((r, index) => {
            const rawOscars = r.oscars;
            const rawGross = r.gross_worldwide;
            const rawBudget = r.budget;

            let parsedX = parseInt(rawOscars);
            const parsedY = parseFloat(rawGross);
            const parsedBudget = parseFloat(rawBudget);

            const jitterAmount = 0.4;
            if (!isNaN(parsedX)) {
                parsedX = parsedX + (Math.random() * jitterAmount) - (jitterAmount / 2);
            }
            return {
                x: !isNaN(parsedX) ? parsedX : 0,
                y: !isNaN(parsedY) ? parsedY : 0,
                title: r.title || "N/A",
                budget: !isNaN(parsedBudget) ? parsedBudget : 0
            };
        });


        const darkBudgetShade = { r: 180, g: 140, b: 20 };
        const lightBudgetShade = { r: 245, g: 197, b: 24 };

        let loggedCount = 0;

        const ctx = document.getElementById('chart-awards').getContext('2d');
        new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Oscars vs Gross Worldwide (Color by Budget)',
                    data: points,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 0.5,
                    borderColor: function(context) {

                        const budget = context.raw.budget;
                        let t = 0;
                        if (budget > 0 && maxBudgetLog > minBudgetLog) {
                            const logBudget = Math.log10(budget);
                            if (logBudget <= minBudgetLog) t = 0;
                            else if (logBudget >= maxBudgetLog) t = 1;
                            else t = (logBudget - minBudgetLog) / (maxBudgetLog - minBudgetLog);
                        } else if (budget > 0 && maxBudgetLog <= minBudgetLog) {
                            t = 1;
                        }

                        const r = Math.round(darkBudgetShade.r + t * (lightBudgetShade.r - darkBudgetShade.r));
                        const g = Math.round(darkBudgetShade.g + t * (lightBudgetShade.g - darkBudgetShade.g));
                        const b = Math.round(darkBudgetShade.b + t * (lightBudgetShade.b - darkBudgetShade.b));
                        return `rgba(${Math.max(0, r-20)}, ${Math.max(0, g-20)}, ${Math.max(0, b-20)}, 0.6)`;
                    },
                    backgroundColor: function(context) {
                        const budget = context.raw.budget;
                        let t = 0;

                        if (budget > 0) {
                            if (maxBudgetLog > minBudgetLog) {
                                const logBudget = Math.log10(budget);
                                if (logBudget <= minBudgetLog) {
                                    t = 0;
                                } else if (logBudget >= maxBudgetLog) {
                                    t = 1;
                                } else {
                                    t = (logBudget - minBudgetLog) / (maxBudgetLog - minBudgetLog);
                                }
                            } else {
                                t = 1;
                            }
                        }

                        if (loggedCount < 20 && budget > 0) { // Log t for the first 20 positive budget points
                            console.log(`Point ${loggedCount}: budget=${budget}, logBudget=${budget > 0 ? Math.log10(budget).toFixed(2) : 'N/A'}, minLogB=${minBudgetLog.toFixed(2)}, maxLogB=${maxBudgetLog.toFixed(2)}, t=${t.toFixed(3)}`);
                            loggedCount++;
                        } else if (loggedCount < 20 && budget <=0) {
                            console.log(`Point ${loggedCount}: budget=${budget}, t=0 (non-positive budget)`);
                            loggedCount++;
                        }


                        const r = Math.round(darkBudgetShade.r + t * (lightBudgetShade.r - darkBudgetShade.r));
                        const g = Math.round(darkBudgetShade.g + t * (lightBudgetShade.g - darkBudgetShade.g));
                        const b = Math.round(darkBudgetShade.b + t * (lightBudgetShade.b - darkBudgetShade.b));

                        return `rgba(${r}, ${g}, ${b}, 0.65)`; // Slightly increased opacity
                    }
                }]
            },
            options: {
                devicePixelRatio: window.devicePixelRatio || 1,
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Industry Recognition: Oscars Won vs. Gross Worldwide'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let labelLines = [];
                                const pointData = context.raw;

                                if (pointData && pointData.title) {
                                    labelLines.push(pointData.title);
                                }

                                const originalX = Math.round(context.parsed.x);
                                labelLines.push(`Oscars: ${originalX}`);

                                if (pointData.y !== null) {
                                    const grossValue = pointData.y;
                                    let displayGross;
                                    if (grossValue >= 1e9) displayGross = (grossValue / 1e9).toFixed(2) + 'B';
                                    else if (grossValue >= 1e6) displayGross = (grossValue / 1e6).toFixed(2) + 'M';
                                    else if (grossValue >= 1e3) displayGross = (grossValue / 1e3).toFixed(2) + 'K';
                                    else displayGross = grossValue.toLocaleString();
                                    labelLines.push(`Gross: $${displayGross}`);
                                }

                                if (pointData.budget !== null && pointData.budget !== undefined) {
                                    const budgetValue = pointData.budget;
                                    let displayBudget;
                                    if (budgetValue >= 1e9) displayBudget = (budgetValue / 1e9).toFixed(2) + 'B';
                                    else if (budgetValue >= 1e6) displayBudget = (budgetValue / 1e6).toFixed(2) + 'M';
                                    else if (budgetValue >= 1e3) displayBudget = (budgetValue / 1e3).toFixed(2) + 'K';
                                    else displayBudget = budgetValue.toLocaleString();
                                    labelLines.push(`Budget: $${displayBudget}`);
                                }
                                return labelLines;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Oscars Won (Number)'
                        },
                        ticks: {
                            callback: function(value, index, values) {
                                if (Number.isInteger(value)) return value;
                                return '';
                            },
                            stepSize: 1,
                            autoSkipPadding: 10
                        },
                    },
                    y: {
                        type: 'logarithmic',
                        min: 10000,
                        title: {
                            display: true,
                            text: 'Gross Worldwide ($) (Logarithmic Scale)'
                        },
                        ticks: {
                            callback: function (value, index, ticks) {
                                const log10 = Math.log10(value);
                                if (value === 0) return '0';
                                if (value === 10000 || value === 100000 || value === 1000000 || value === 10000000 || value === 100000000 || value === 1000000000 || value === 10000000000) {
                                    if (value >= 1e9) return (value / 1e9).toFixed(0) + 'B';
                                    if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M';
                                    if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
                                    return value.toString();
                                }
                                if (log10 === Math.floor(log10)) {
                                    if (value >= 1e9) return (value / 1e9).toFixed(0) + 'B';
                                    if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M';
                                    if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
                                    return value.toString();
                                }
                                return '';
                            },
                        },
                        afterBuildTicks: function(scaleInstance) {
                            scaleInstance.ticks = scaleInstance.ticks.filter(tick => tick.value > 0);
                        }
                    }
                }
            }
        });
    }



});

