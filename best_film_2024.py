import pandas as pd

# Load the dataset
df = pd.read_csv('data/final_dataset.csv')

# Filter for movies from the year 2024
df_2024 = df[df['year'] == 2024]

# Drop rows with missing ratings (if any)
df_2024 = df_2024.dropna(subset=['rating'])

# Get the movie with the highest IMDb rating
best_film_2024 = df_2024.loc[df_2024['rating'].idxmax()]

# Print the best film's info
print("🎬 Best Film of 2024 Based on IMDb Rating:")
print(best_film_2024[['title', 'rating', 'genre_grouped', 'budget', 'gross_worldwide', 'wins', 'oscars']])
