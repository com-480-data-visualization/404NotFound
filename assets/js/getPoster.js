/**
 * Try the local file first; if missing, fetch OMDb JSON to get the Poster URL.
 *
 * @param {string} title — movie title
 * @param {string|number} year — release year
 * @returns {Promise<string>} URL to image (local, OMDb, or fallback)
 */
async function getPosterUrl(title, year) {
    const key          = 'f58a7502';  // your OMDb API key
    const encodedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const localUrl     = `./data/images/${year}/${encodedTitle}.jpg`;
    const omdbApiUrl   = `https://www.omdbapi.com/?apikey=${key}&t=${encodedTitle}&y=${year}`;
    const placeholder  = './data/images/no-poster.jpeg'; // a generic fallback

    // 1) Check local file via HEAD
    try {
        const headResp = await fetch(localUrl, { method: 'HEAD' });
        if (headResp.ok) {
            return localUrl;
        }
    } catch (err) {
        // network/CORS error—ignore and fall back
        //console.warn(err);
    }

    // 2) Query OMDb JSON API for this title/year
    // TODO without waiting for each image to download before displaying everything.

    // 3) Ultimate fallback
    return null;
}
