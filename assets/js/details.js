
document.addEventListener('DOMContentLoaded', () => {
    const data = localStorage.getItem('selectedMovie');
    if (data) {
        console.log(data);
        const movie = JSON.parse(data);
        document.getElementById('movie-title').textContent = movie.title;
        document.getElementById('movie-year').textContent = movie.year;
        document.getElementById('movie-time').textContent = movie.duration;
        document.getElementById('movie-rating').textContent = movie.rating + " / 10";

        // Convert stringified lists to arrays
        const genres = parseListString(movie.genres);
        const writers = parseListString(movie.writers);
        const stars = parseListString(movie.stars);

        // Join arrays with ", " and display them
        document.getElementById('movie-genres').innerHTML = `<strong>Genre(s):</strong> ${genres.join(', ')}`;
        document.getElementById('movie-writer').innerHTML = `<strong>Writer(s):</strong> ${writers.join(', ')}`;
        document.getElementById('movie-star').innerHTML = `<strong>Star(s):</strong> ${stars.join(', ')}`;


        const posterUrl = getPosterUrl(movie.title, movie.year)
        console.log("poster url", posterUrl)
        document.getElementById('movie-poster').src = posterUrl;

    } else {
        // Fallback if no movie found
        document.getElementById('movie-title').textContent = 'Movie not found';
    }
});

// Utility to safely parse strings like "['a', 'b']"
function parseListString(str) {
    try {
        return JSON.parse(str.replace(/'/g, '"'));
    } catch (e) {
        console.warn("Failed to parse list string:", str);
        return [];
    }
}
