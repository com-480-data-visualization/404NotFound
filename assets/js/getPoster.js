import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const somethingThatShouldNotBeThere = "f58a7502"

const FIRST_YEAR = 1960
const LAST_YEAR = 2024

const API_KEY_BY_DAY = 1000;
const DAY = 1; // We have 1'000 api calls so change to day 1, 2, ... to make next api call.


/*
    INFORMATION
    this file enable to get the poster of a movie by giving the film title and year.
    This will cache the film on the folder data/images/year

    // Example usage

    fetchPosterWithCache("Oppenheimer", 2023, (filePath) => {
        console.log("Poster ready at:", filePath);
    });
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
    try {
        await fs.writeFile(filePath, buffer);
    }catch (e){
        console.error(e);
    }

    console.log(`Saved: ${filePath}`);
}

// Main function with local + remote cache logic
export async function fetchPosterWithCache(title, year, onReady) {
    try {
        const fileName = `${title.replace(/[^a-z0-9]/gi, '')}.jpg`;
        const savePath = path.join(__dirname, `../../data/images/${year}/${fileName}`);

        console.log(`Downloading ${savePath}`);
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








// Helper: Parse CSV string into an array of objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
        const values = line.split(';').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i];
        });
        return obj;
    });
}

// Helper: Fetch and parse the CSV file
async function loadCSV(filePath) {
    const text = await readFile(filePath, 'utf-8');
    return parseCSV(text);
}

// Main: Process CSV and fetch posters
async function processAndFetchPosters(csvUrl) {
    const movies = await loadCSV(csvUrl);

    let numberMoviePerYear = Math.floor(API_KEY_BY_DAY / (LAST_YEAR - FIRST_YEAR + 1))

    for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
        const moviesOfYear = movies
            .filter(m => parseInt(m.year) === year && !isNaN(parseFloat(m.rating)))
            .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
            .slice(DAY * numberMoviePerYear, (DAY+1) * numberMoviePerYear);

        for (const movie of moviesOfYear) {
            console.log(`${movie.year} - ${movie.title}`);
            fetchPosterWithCache(movie.title, year, (filePath) => {
                //console.log(`Poster ready at: ${filePath} for "${movie.title}" (${year})`);
            });
        }
    }
}

// Example usage
processAndFetchPosters('../../data/final_dataset.csv');


/*fetchPosterWithCache("What Ever Happened to Baby Jane?", 1962, (filePath) => {
    console.log("Poster ready at:", filePath);
});*/