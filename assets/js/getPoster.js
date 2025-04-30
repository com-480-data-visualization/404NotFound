import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const somethingThatShouldNotBeThere = "e19248a8"

/*
    INFORMATION
    this file enable to get the poster of a movie by giving the film title and year.
    This will cache the film on the folder data/images/year

    There is an example on how to use it at the end.
 */

// Get poster URL from OMDb
async function getPoster(title, year) {
    const baseUrl = 'http://www.omdbapi.com/';
    const params = new URLSearchParams({
        apikey: somethingThatShouldNotBeThere,
        t: title,
        y: year
    });

    const response = await fetch(`${baseUrl}?${params}`);
    const data = await response.json();

    if (data.Response === "True" && data.Poster && data.Poster !== "N/A") {
        return data.Poster;
    } else {
        throw new Error(`Poster not found for "${title}" (${year})`);
    }
}

// Download image and save to disk
async function downloadImage(url, filePath) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);

    const buffer = await res.buffer();
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, buffer);
    console.log(`Saved: ${filePath}`);
}

// Main function with local + remote cache logic
export async function fetchPosterWithCache(title, year, onReady) {
    try {
        const fileName = `${title.replace(/[^a-z0-9]/gi, '')}.jpg`;
        const savePath = path.join(__dirname, `../data/images/${year}/${fileName}`);

        if (await fs.pathExists(savePath)) {
            console.log(`Local cache hit: ${savePath}`);
            onReady(savePath); // Immediately callback with local path
            return;
        }

        const posterUrl = await getPoster(title, year);
        await downloadImage(posterUrl, savePath);

        onReady(savePath); // Callback after downloading
    } catch (err) {
        console.error(`Error for "${title}" (${year}):`, err.message);
    }
}

// Example usage
/*
fetchPosterWithCache("Oppenheimer", 2023, (filePath) => {
    console.log("Poster ready at:", filePath);
});
*/