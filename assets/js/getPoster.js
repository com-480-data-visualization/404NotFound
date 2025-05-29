/**
 * Try the local file first; if missing, fetch OMDb JSON to get the Poster URL.
 *
 * @param {string} title — movie title
 * @param {string|number} year — release year
 * @returns {Promise<string>} URL to image (local, OMDb, or fallback)
 */
async function getPosterUrl(title, year) {
    const key          = 'f58a7502';  // your OMDb API key
    const encodedTitle = title.toLowerCase().replace(/[^a-z0-9\.]/g, '');
    const localUrl     = `./data/images/${year}/${encodedTitle}.jpg`;
    const omdbApiUrl   = `https://www.omdbapi.com/?apikey=${key}&t=${encodedTitle}&y=${year}`;
    const placeholder  = './data/images/no-poster.jpeg'; // a generic fallback

    console.log(encodedTitle);
    // 1) Check local file via HEAD
    try {
        const headResp = await fetch(localUrl, { method: 'HEAD' });
        if (headResp.ok) {
            console.log(`poster ${localUrl}` )
            return localUrl;
        }
    } catch (err) {
        // network/CORS error—ignore and fall back
        //console.warn(err);
    }

    // 2) Query OMDb JSON API for this title/year
    /*try {
        const apiResp = await fetch(omdbApiUrl);
        if (apiResp.ok) {
            const json = await apiResp.json();
            // OMDb returns Poster: "N/A" if none found
            if (json.Poster && json.Poster !== 'N/A') {
                return json.Poster;
            }
        }
    } catch (err) {
        // API network error—ignore and fall back
        console.error(err);
    }*/

    // 3) Ultimate fallback
    return placeholder;
}
