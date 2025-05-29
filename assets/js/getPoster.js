/**
 * Generate the relative URL to a movie poster image
 * Assumes images are stored in: /images/{year}/{sanitized_title}.jpg
 *
 * @param {string} title - Movie title
 * @param {number|string} year - Release year
 * @returns {string} - Relative image URL
 */
function getPosterUrl(title, year) {
    return `./data/images/${year}/${title}.jpg`;
}
